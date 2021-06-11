import React, {
  forwardRef,
  ReactElement,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  View,
  PanResponder,
  StyleSheet,
  PanResponderGestureState,
  ViewStyle,
  StyleProp,
  Pressable,
} from 'react-native';
import {heightPercentageToDP} from 'react-native-responsive-screen';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {isPullingDown, isPullingDownWithMomentum, isPullingUp} from './util';

interface BottomSheetProps {
  children?: ReactElement<any>;
  useScroll?: boolean;
  backgroundStyle?: StyleProp<ViewStyle>;
  overlayStyle?: StyleProp<ViewStyle>;
  fixedContent?: ReactElement<any>;
  backgroundOpacity?: number;
  dismissOnClickOutside?: boolean;
  dismissOnMomentumPull?: boolean;
  dismissOnPullExtend?: boolean;

  handleStyle: StyleProp<ViewStyle>;

  onDismiss?: {(): void};
  getShortFormHeight?: () => number;
  getLongFormHeight: () => number;
}

export interface CardBottomSheetRef {
  dismiss;
}
const screenHeight = heightPercentageToDP(100);

const last = array => {
  'worklet';
  return array[array.length - 1];
};
const first = array => {
  'worklet';
  return array[0];
};

const BottomSheet = forwardRef<CardBottomSheetRef, BottomSheetProps>(
  (props, ref) => {
    const {
      dismissOnClickOutside = true,
      dismissOnMomentumPull = true,
      dismissOnPullExtend = true,
    } = props;
    const {bottom} = useSafeAreaInsets();

    const [stops, setStops] = useState(getStops());
    const stop = useRef(0);

    const panEnabled = useRef(true);
    const scrollY = useSharedValue(0);
    const y = useSharedValue(heightPercentageToDP(100) + last(stops));
    const original = useRef(null);
    useEffect(() => {
      animateToStop(0);
    }, []);

    useImperativeHandle(ref, () => ({
      dismiss,
      updateLayout,
    }));

    function getStops() {
      return [
        !!props.getShortFormHeight
          ? heightPercentageToDP(100) - props.getShortFormHeight()
          : null,
        !!props.getLongFormHeight
          ? heightPercentageToDP(100) - props.getLongFormHeight()
          : null,
      ].filter(item => !!item);
    }

    function updateLayout() {
      setStops(getStops());
    }
    const panResponder = React.useRef(
      PanResponder.create({
        onMoveShouldSetPanResponder: () => {
          return panEnabled.current;
        },
        onMoveShouldSetPanResponderCapture: (_, state) => {
          if (state.dy === 0) {
            panEnabled.current = false;
          } else if (scrollY.value === 0 && isPullingDown(state)) {
            panEnabled.current = true;
          } else if (scrollY.value !== 0) {
            panEnabled.current = false;
          } else if (y.value <= last(stops)) {
            panEnabled.current = false;
          } else {
            panEnabled.current = true;
          }
          return panEnabled.current;
        },
        onPanResponderReject: () => {
          panEnabled.current = false;
        },

        onPanResponderMove: (__, gestureState) => {
          const {dy} = gestureState;
          if (original.current === null) {
            original.current = y.value;
          }
          let newYValue = original.current + dy;
          // pulling over the top
          if (newYValue < last(stops)) {
            // if above stops[1] then start calculating the displacement from stops[1]
            const yDisplacement =
              original.current === last(stops) ? dy : newYValue - last(stops);
            newYValue = last(stops) + yDisplacement / 8;
          }
          y.value = newYValue;
        },
        onPanResponderTerminationRequest: __ => true,
        onPanResponderRelease: (__, gestureState) => {
          original.current = null;
          onPanRelease({...gestureState});
        },
        onPanResponderTerminate: () => {},
        onShouldBlockNativeResponder: () => {
          return true;
        },
      }),
    ).current;

    function animateToStop(stopIndex) {
      stop.current = stopIndex;
      y.value = withSpring(stops[stopIndex], {mass: 0.5});
    }
    function onPanRelease(state: PanResponderGestureState) {
      if (isPullingDownWithMomentum(state, 2) && dismissOnMomentumPull) {
        return dismiss();
      }
      if (y.value < last(stops)) {
        return animateToStop(stops.length - 1);
      }
      // pulling below the first point
      if (y.value > first(stops) && dismissOnPullExtend) {
        return dismiss();
      }
      autoSnapToStop(state);
    }
    function autoSnapToStop(state: PanResponderGestureState) {
      let stop = 0;
      if (isPullingDown(state)) {
        stop = 0;
      } else if (isPullingUp(state)) {
        stop = stops.length - 1;
      } else if (
        stops.length > 1 &&
        Math.abs(y.value - first(stops)) < Math.abs(y.value - last(stops))
      ) {
        // is between the first and second point closer to the first
        stop = 0;
      } else {
        stop = stops.length - 1;
      }
      animateToStop(stop);
    }
    function dismiss() {
      y.value = withTiming(heightPercentageToDP(100), {duration: 300});
      setTimeout(props.onDismiss, 300);
    }

    const backgroundStyle = useAnimatedStyle(() => {
      if (typeof props.backgroundOpacity !== 'undefined') {
        return {
          opacity: props.backgroundOpacity,
        };
      }
      return {
        opacity: interpolate(
          y.value,
          [screenHeight, screenHeight - last(stops)],
          [0, 0.9],
        ),
      };
    });

    const overlayStyle = useAnimatedStyle(() => {
      return {
        transform: [
          {
            translateY:
              stops.length > 1
                ? interpolate(
                    y.value,
                    [first(stops), last(stops)],
                    [first(stops), last(stops)],
                  )
                : y.value,
          },
        ],
      };
    });
    const scrollHandler = useAnimatedScrollHandler({
      onScroll: e => {
        scrollY.value = e.contentOffset.y;
      },
    });
    function renderChildren() {
      if (props.useScroll) {
        return (
          <Animated.View
            style={{
              height: props.getLongFormHeight(),
            }}>
            <Animated.ScrollView
              style={{
                flex: 1,
              }}
              contentContainerStyle={{
                paddingBottom: bottom + 20,
              }}
              onScroll={scrollHandler}
              scrollEventThrottle={1}>
              {props.children}
            </Animated.ScrollView>
          </Animated.View>
        );
      }
      return props.children;
    }
    function renderHeader() {
      return (
        <View style={styles.handleContainer}>
          <View style={[styles.handle, props.handleStyle]} />
        </View>
      );
    }
    function handleTouchStart() {
      dismissOnClickOutside && dismiss();
    }
    return (
      <>
        <Animated.View
          pointerEvents={dismissOnClickOutside ? 'auto' : 'none'}
          style={[styles.background, props.backgroundStyle, backgroundStyle]}>
          <Pressable
            style={styles.pressable}
            onPress={handleTouchStart}></Pressable>
        </Animated.View>
        <Animated.View
          {...panResponder.panHandlers}
          style={[styles.content, overlayStyle, props.overlayStyle]}>
          {renderHeader()}
          {renderChildren()}
        </Animated.View>
        {props.fixedContent}
      </>
    );
  },
);

const styles = StyleSheet.create({
  background: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    position: 'absolute',
    height: '100%',
    width: '100%',
  },
  pressable: {backgroundColor: 'transparent', height: '100%', width: '100%'},
  content: {
    borderRadius: 15,
    backgroundColor: 'white',
    position: 'absolute',
    zIndex: 10,
    left: 0,
    right: 0,
    bottom: 0,
    height: heightPercentageToDP(100),
  },
  handle: {
    backgroundColor: '#ededed',
    height: 5,
    width: '25%',
    alignSelf: 'center',
  },
  handleContainer: {
    paddingVertical: 10,
  },
});

export default BottomSheet;
