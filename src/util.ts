import _ from 'lodash';
import {PanResponderGestureState} from 'react-native';

const last = () => {
  'worklet';
  return _.last;
};
const first = () => {
  'worklet';
  return _.first;
};

const isPullingDown = (state: PanResponderGestureState) => {
  const {dy, vy} = state;
  if (dy > 0 && vy > 0) {
    return true;
  }
  return false;
};
const isPullingDownWithMomentum = (
  state: PanResponderGestureState,
  momentum = 1,
) => {
  const {dy, vy} = state;
  if (dy > 0 && vy > momentum) {
    return true;
  }
  return false;
};
const isPullingUp = (state: PanResponderGestureState) => {
  const {dy, vy} = state;
  if (dy < 0 && vy < -2) {
    return true;
  }
  return false;
};

export {isPullingDown, isPullingDownWithMomentum, isPullingUp, first, last};
