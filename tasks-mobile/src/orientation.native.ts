import * as ScreenOrientation from 'expo-screen-orientation';
import {createRotationController} from './rotationController';

// Keep this as the only orientation owner. RNScreens per-screen orientation
// takes precedence over Expo's orientation registry on iOS.
export const focusOrientation = createRotationController(focus =>
  ScreenOrientation.lockAsync(focus
    ? ScreenOrientation.OrientationLock.DEFAULT
    : ScreenOrientation.OrientationLock.PORTRAIT_UP));
