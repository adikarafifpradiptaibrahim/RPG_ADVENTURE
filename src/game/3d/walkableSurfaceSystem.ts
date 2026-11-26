import * as THREE from 'three';
import { getExactMeshGroundHeight } from './worldEnvironment';

/**
 * Representasi satu permukaan padat (lantai, dek jembatan, dermaga, altar, tangga, podium)
 * yang terdaftar dalam Registry Permukaan Solid Global agar karakter, NPC, monster,
 * boss, dan efek skill (AoE / hujan panah) tidak pernah tenggelam menembus struktur 3D.
 */
export interface WalkableEntry {
  mesh: THREE.Object3D;
  box: THREE.Box3;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
  label?: string;
}

export interface RegisterWalkableOptions {
  /** Label opsional untuk debugging struktur terregistrasi. */
  label?: string;
  /** Jika true, hanya daftarkan child yang tidak ditandai `userData.nonWalkable = true`. Default: true. */
  skipNonWalkable?: boolean;
  /** Padding horizontal minimal AABB untuk menghindari lolos di sambungan pinggir tipis. Default: 0.12. */
  marginXZ?: number;
}

/** Daftar global seluruh permukaan solid walkable di dunia aktif. */
export const walkableEntries: WalkableEntry[] = [];

// Pre-allocated zero-allocation scratch buffers untuk kueri tinggi permukaan per frame
const _raycaster = new THREE.Raycaster();
const _rayOrigin = new THREE.Vector3();
const _rayDirDown = new THREE.Vector3(0, -1, 0);
const _rayHits: THREE.Intersection[] = [];
const _candidateMeshes: THREE.Object3D[] = [];
const _candidateEntries: WalkableEntry[] = [];
const _scratchBox = new THREE.Box3();
const _scratchNormal = new THREE.Vector3();
const _scratchNormalMat = new THREE.Matrix3();
const _scratchInstanceMat = new THREE.Matrix4();
const _scratchCombinedMat = new THREE.Matrix4();

const MIN_WALKABLE_NORMAL_Y = 0.35;
const MAX_STEP_UP_HEIGHT = 1.8;

/**
 * Mengosongkan registry permukaan solid saat membangun ulang atau membersihkan scene dunia.
 */
export function clearWalkableSurfaces(): void {
  walkableEntries.length = 0;
  _candidateMeshes.length = 0;
  _candidateEntries.length = 0;
  _rayHits.length = 0;
}

function isMeshLikelyVerticalOrTinyDecorative(mesh: THREE.Mesh, box: THREE.Box3): boolean {
  if (mesh.userData?.walkableSurface === true) return false;
  if (mesh.userData?.nonWalkable === true) return true;

  const sizeX = box.max.x - box.min.x;
  const sizeY = box.max.y - box.min.y;
  const sizeZ = box.max.z - box.min.z;

  // Tiang lampu, obor, railing tipis vertikal: penampang XZ sangat kecil tapi tinggi besar
  if (sizeX < 0.75 && sizeZ < 0.75 && sizeY > 1.1) {
    return true;
  }

  // Detail mikro (< 0.18 unit di kedua sumbu horizontal) tidak layak jadi pijakan
  if (Math.max(sizeX, sizeZ) < 0.25) {
    return true;
  }

  return false;
}

/**
 * Mendaftarkan seluruh mesh pijakan padat di dalam `object3D` (Group atau Mesh) ke `walkableEntries`.
 * Otomatis memperbarui `matrixWorld`, menghitung AABB 3D akurat, dan melewati dekorasi `userData.nonWalkable`.
 */
export function registerWalkableSurface(
  object3D: THREE.Object3D | null | undefined,
  options: RegisterWalkableOptions = {}
): number {
  if (!object3D) return 0;

  const skipNonWalkable = options.skipNonWalkable ?? true;
  const marginXZ = options.marginXZ ?? 0.12;

  object3D.updateMatrixWorld(true);

  let registeredCount = 0;
  object3D.traverse((child) => {
    // Lewati cabang hierarki yang secara eksplisit bukan pijakan (railing, lampu, api, atap tinggi, pagar)
    if (skipNonWalkable && child.userData?.nonWalkable === true) {
      return;
    }
    if ((child as THREE.Light).isLight || (child as THREE.Points).isPoints || (child as THREE.Line).isLine || (child as THREE.Sprite).isSprite) {
      return;
    }

    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;

    // Pastikan tidak mendaftarkan objek duplikat atau anak dari parent yang nonWalkable
    if (skipNonWalkable) {
      let p: THREE.Object3D | null = child.parent;
      while (p) {
        if (p.userData?.nonWalkable === true) return;
        if (p === object3D) break;
        p = p.parent;
      }
    }

    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (!mat) return;
    // Jangan jadikan bidang air transparan, kabut, atau lingkaran sihir emissive aditif tanpa kedalaman sebagai pijakan solid
    const firstMat = Array.isArray(mat) ? mat[0] : mat;
    if (firstMat && (firstMat as THREE.MeshBasicMaterial).blending === THREE.AdditiveBlending) {
      return;
    }

    mesh.updateWorldMatrix(true, false);
    if (!mesh.geometry) return;
    if (!mesh.geometry.boundingBox) {
      mesh.geometry.computeBoundingBox();
    }

    _scratchBox.setFromObject(mesh);
    if (_scratchBox.isEmpty()) return;

    if (skipNonWalkable && isMeshLikelyVerticalOrTinyDecorative(mesh, _scratchBox)) {
      return;
    }

    const entryBox = _scratchBox.clone();
    walkableEntries.push({
      mesh,
      box: entryBox,
      minX: entryBox.min.x - marginXZ,
      maxX: entryBox.max.x + marginXZ,
      minZ: entryBox.min.z - marginXZ,
      maxZ: entryBox.max.z + marginXZ,
      minY: entryBox.min.y,
      maxY: entryBox.max.y,
      label: options.label || object3D.name || mesh.name || undefined,
    });
    registeredCount++;
  });

  return registeredCount;
}

/**
 * Mengembalikan tinggi permukaan solid paling akurat di koordinat dunia (x, z)
 * dengan menggabungkan heightmap terrain (`getExactMeshGroundHeight`) dan raycast ke
 * permukaan 3D terregistrasi (`walkableEntries`).
 *
 * Pre-filter AABB O(1) memastikan 0 raycast saat berjalan di terrain terbuka,
 * dan 1 raycast downward zero-allocation hanya terhadap mesh kandidat di atas/bawah posisi ini.
 */
export function getSolidGroundHeight(x: number, z: number, currentY?: number): number {
  const bestY = getExactMeshGroundHeight(x, z);
  const entryCount = walkableEntries.length;
  if (entryCount === 0) {
    return bestY;
  }

  const hasCurrentY = typeof currentY === 'number' && Number.isFinite(currentY);
  const maxAcceptY = hasCurrentY ? (currentY as number) + MAX_STEP_UP_HEIGHT : Number.POSITIVE_INFINITY;

  _candidateMeshes.length = 0;
  _candidateEntries.length = 0;
  let maxCandidateTopY = bestY;

  for (let i = 0; i < entryCount; i++) {
    const entry = walkableEntries[i];
    if (x < entry.minX || x > entry.maxX || z < entry.minZ || z > entry.maxZ) {
      continue;
    }
    // Abaikan permukaan yang sepenuhnya terpendam di bawah terrain atau jauh di atas jangkauan langkah
    if (entry.maxY < bestY - 0.15) continue;
    if (hasCurrentY && entry.minY > maxAcceptY) continue;

    _candidateMeshes.push(entry.mesh);
    _candidateEntries.push(entry);
    if (entry.maxY > maxCandidateTopY) {
      maxCandidateTopY = entry.maxY;
    }
  }

  if (_candidateMeshes.length === 0) {
    return bestY;
  }

  const rayOriginY = hasCurrentY
    ? Math.max((currentY as number) + MAX_STEP_UP_HEIGHT, bestY + MAX_STEP_UP_HEIGHT)
    : maxCandidateTopY + 2.0;

  _rayOrigin.set(x, rayOriginY, z);
  _raycaster.set(_rayOrigin, _rayDirDown);
  _raycaster.near = 0;
  _raycaster.far = Math.max(24, rayOriginY - bestY + 12);

  _rayHits.length = 0;
  _raycaster.intersectObjects(_candidateMeshes, false, _rayHits);

  let resolvedY = bestY;
  for (let h = 0; h < _rayHits.length; h++) {
    const hit = _rayHits[h];
    const hitY = hit.point.y;
    if (hitY <= resolvedY) continue;
    if (hasCurrentY && hitY > maxAcceptY) continue;

    // Pastikan permukaan yang disentuh menghadap ke atas (bukan sisi samping dinding vertikal)
    if (hit.face) {
      const hitMesh = hit.object as THREE.Mesh;
      if ((hitMesh as THREE.InstancedMesh).isInstancedMesh && hit.instanceId !== undefined) {
        (hitMesh as THREE.InstancedMesh).getMatrixAt(hit.instanceId, _scratchInstanceMat);
        _scratchCombinedMat.multiplyMatrices(hitMesh.matrixWorld, _scratchInstanceMat);
        _scratchNormalMat.getNormalMatrix(_scratchCombinedMat);
      } else {
        _scratchNormalMat.getNormalMatrix(hitMesh.matrixWorld);
      }
      _scratchNormal.copy(hit.face.normal).applyMatrix3(_scratchNormalMat).normalize();
      if (_scratchNormal.y < MIN_WALKABLE_NORMAL_Y) {
        continue;
      }
    }

    resolvedY = hitY;
  }

  return Math.max(bestY, resolvedY);
}
