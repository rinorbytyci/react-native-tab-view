/* @flow */

import * as React from 'react';
import { StyleSheet } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import type { Layout, NavigationState, Route } from './types';

const {
  Clock,
  Extrapolate,
  Value,
  onChange,
  abs,
  add,
  block,
  call,
  clockRunning,
  cond,
  divide,
  eq,
  event,
  greaterThan,
  interpolate,
  max,
  min,
  multiply,
  or,
  round,
  set,
  spring,
  startClock,
  stopClock,
  sub,
} = Animated;

const TRUE = 1;
const FALSE = 0;
const NOOP = 0;

const SPRING_CONFIG = {
  damping: 35,
  mass: 2,
  stiffness: 100,
  overshootClamping: true,
  restSpeedThreshold: 0.001,
  restDisplacementThreshold: 0.001,
};

type Props<T: Route> = {
  swipeEnabled: boolean,
  jumpTo: (key: string) => mixed,
  navigationState: NavigationState<T>,
  layout: Layout,
  children: (props: {
    position: Animated.Node<number>,
    render: (children: React.Node) => React.Node,
  }) => React.Node,
};

export default class Pager<T: Route> extends React.Component<Props<T>> {
  componentDidUpdate(prevProps: Props<T>) {
    const { index } = this.props.navigationState;

    if (index !== prevProps.navigationState.index) {
      this._isSwipeGesture.setValue(FALSE);
      this._nextIndex.setValue(index);
    }

    if (
      prevProps.navigationState.routes.length !==
      this.props.navigationState.routes.length
    ) {
      this._routesLength.setValue(this.props.navigationState.routes.length);
    }

    if (prevProps.layout.width !== this.props.layout.width) {
      this._layoutWidth.setValue(this.props.layout.width);
    }
  }

  // Current state of the gesture
  _velocityX = new Value(0);
  _gestureX = new Value(0);
  _gestureState = new Value(-1);
  _offsetX = new Value(0);

  // Current position of the page (translateX value)
  _position = new Value(
    // Intial value is based on the index and page width
    -this.props.navigationState.index * this.props.layout.width
  );

  // Initial index of the tabs
  _index = new Value(this.props.navigationState.index);

  // Next index of the tabs, updated for navigation from outside (tab press, state update)
  _nextIndex = new Value(this.props.navigationState.index);

  // Whether the user is currently dragging the screen
  _isSwiping = new Value(FALSE);

  // Whether the update was due to swipe gesture
  // Remember to set it when transition needs to occur
  _isSwipeGesture = new Value(FALSE);

  _clock = new Clock();

  _routesLength = new Value(this.props.navigationState.routes.length);

  // tslint:disable-next-line: strict-boolean-expressions
  _layoutWidth = new Value(this.props.layout.width || 320);

  _swipeDistanceThreshold = divide(this._layoutWidth, 1.75);
  _swipeVelocityThreshold = 1200;

  transitionTo = (index: Animated.Node<number>) => {
    const state = {
      position: this._position,
      velocity: this._velocityX,
      time: new Value(0),
      finished: new Value(0),
    };

    const config = {
      ...SPRING_CONFIG,
      toValue: new Value(0),
    };

    return block([
      cond(clockRunning(this._clock), NOOP, [
        // Animation wasn't running before
        // Set the initial values and start the clock
        set(config.toValue, multiply(index, this._layoutWidth, -1)),
        set(state.finished, 0),
        set(state.time, 0),
        set(this._index, index),
        startClock(this._clock),
      ]),
      // Animate the values with a spring
      spring(this._clock, state, config),
      cond(state.finished, [
        // When spring animation finishes, stop the clock
        stopClock(this._clock),
        // Reset gesture and velocity from previous gesture
        set(this._gestureX, 0),
        set(this._velocityX, 0),
        call([this._index], ([value]) => {
          // If the index changed, and previous spring was finished, update state
          const route = this.props.navigationState.routes[Math.round(value)];

          this.props.jumpTo(route.key);
        }),
      ]),
    ]);
  };

  handleGestureEvent = event([
    {
      nativeEvent: {
        translationX: this._gestureX,
        velocityX: this._velocityX,
        state: this._gestureState,
      },
    },
  ]);

  translateX = block([
    onChange(
      // Index changed from outside
      this._nextIndex,
      cond(or(eq(this._index, this._nextIndex), this._isSwipeGesture), NOOP, [
        // Stop any running animations
        stopClock(this._clock),
        // Update the index to trigger the transition
        set(this._index, this._nextIndex),
      ])
    ),
    cond(
      eq(this._gestureState, State.ACTIVE),
      [
        cond(this._isSwiping, NOOP, [
          // We weren't dragging before, set it to true
          set(this._isSwiping, TRUE),
          set(this._isSwipeGesture, TRUE),
          // Also update the drag offset to the last position
          set(this._offsetX, this._position),
        ]),
        // Update position with previous offset + gesture distance
        set(this._position, add(this._offsetX, this._gestureX)),
        // Stop animations while we're dragging
        stopClock(this._clock),
      ],
      [
        set(this._isSwiping, FALSE),
        this.transitionTo(
          // Calculate the next index
          cond(
            or(
              greaterThan(abs(this._gestureX), this._swipeDistanceThreshold),
              greaterThan(abs(this._velocityX), this._swipeVelocityThreshold)
            ),
            // For swipe gesture, to calculate the index, determine direction and add to index
            round(
              min(
                max(
                  0,
                  sub(
                    this._index,
                    cond(
                      greaterThan(
                        // Gesture can be positive, or negative
                        // Get absolute for comparision
                        abs(this._gestureX),
                        this._swipeDistanceThreshold
                      ),
                      // If gesture value exceeded the threshold, calculate direction from distance
                      divide(this._gestureX, abs(this._gestureX)),
                      // Otherwise calculate direction from the gesture velocity
                      divide(this._velocityX, abs(this._velocityX))
                    )
                  )
                ),
                sub(this._routesLength, 1)
              )
            ),
            // Otherwise index didn't change/changed due to state update
            this._index
          )
        ),
      ]
    ),

    this._position,
  ]);

  render() {
    const { layout, navigationState, swipeEnabled, children } = this.props;
    const maxTranslate = layout.width * (navigationState.routes.length - 1);
    const translateX = interpolate(this.translateX, {
      inputRange: [-maxTranslate, 0],
      outputRange: [-maxTranslate, 0],
      extrapolate: Extrapolate.CLAMP,
    });

    return children({
      position: divide(abs(translateX), layout.width),
      render: children => (
        <PanGestureHandler
          enabled={layout.width !== 0 && swipeEnabled}
          onGestureEvent={this.handleGestureEvent}
          onHandlerStateChange={this.handleGestureEvent}
          minDist={10}
          minDeltaX={10}
        >
          <Animated.View
            // @ts-ignore
            style={[
              styles.container,
              layout.width
                ? {
                    width: layout.width * navigationState.routes.length,
                    transform: [{ translateX }],
                  }
                : null,
            ]}
          >
            {children}
          </Animated.View>
        </PanGestureHandler>
      ),
    });
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
});
