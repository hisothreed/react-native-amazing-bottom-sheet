import {useCallback, useRef, useState} from 'react';
import {
  LayoutChangeEvent,
  LayoutRectangle,
  NativeSyntheticEvent,
} from 'react-native';

export function useComponentLayout(
  onLayoutCb: (value: LayoutRectangle) => void,
  {runOnce} = {runOnce: false},
): [
  bounds: LayoutRectangle,
  onLayout: (
    value: NativeSyntheticEvent<{
      layout: LayoutRectangle;
    }>,
  ) => void,
] {
  const bounds = useRef(null);
  const didRun = useRef(false);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    if (runOnce && didRun.current) {
      return;
    }
    didRun.current = true;
    const {width, height, x, y} = event.nativeEvent.layout;
    if (bounds?.current?.height === height) {
      return;
    }
    bounds.current = {width, height};
    onLayoutCb({width, height, x, y});
  }, []);

  return [bounds.current, onLayout];
}
