import React from 'react';
import {
  HunterModel,
  HunterModelProps,
  createHunterModel,
  createBlockyHunterMesh,
  USE_LEGACY_HUNTER,
  createLegacyHunterMesh,
  animateHunterWalk,
} from './HunterModel';

export {
  createHunterModel as createAssassinModel,
  createBlockyHunterMesh as createBlockyAssassinMesh,
  USE_LEGACY_HUNTER as USE_LEGACY_ASSASSIN,
  createLegacyHunterMesh as createLegacyAssassinMesh,
  animateHunterWalk as animateAssassinWalk,
  createHunterModel,
  createBlockyHunterMesh,
  animateHunterWalk,
};

export interface AssassinModelProps extends HunterModelProps {}

export const AssassinModel: React.FC<AssassinModelProps> = (props) => {
  return <HunterModel {...props} />;
};

export default AssassinModel;
