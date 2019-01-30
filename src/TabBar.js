/* @flow */

import * as React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Platform,
  I18nManager,
} from 'react-native';
import type { Scene, SceneRendererProps } from './types';
import type {
  ViewStyleProp,
  TextStyleProp,
} from 'react-native/Libraries/StyleSheet/StyleSheet';
import Animated from 'react-native-reanimated';
import TabBarItem from './TabBarItem';

type IndicatorProps<T> = SceneRendererProps<T> & {
  width: number,
};

type Props<T> = SceneRendererProps<T> & {
  scrollEnabled?: boolean,
  bounces?: boolean,
  pressColor?: string,
  pressOpacity?: number,
  getLabelText: (scene: Scene<T>) => ?string,
  getAccessible: (scene: Scene<T>) => ?boolean,
  getAccessibilityLabel: (scene: Scene<T>) => ?string,
  getTestID: (scene: Scene<T>) => ?string,
  renderLabel?: (scene: Scene<T>) => React.Node,
  renderIcon?: (scene: Scene<T>) => React.Node,
  renderBadge?: (scene: Scene<T>) => React.Node,
  renderIndicator?: (props: IndicatorProps<T>) => React.Node,
  onTabPress?: (scene: Scene<T>) => mixed,
  onTabLongPress?: (scene: Scene<T>) => mixed,
  tabStyle?: ViewStyleProp,
  indicatorStyle?: ViewStyleProp,
  labelStyle?: TextStyleProp,
  style?: ViewStyleProp,
};

type State = {|
  scrollAmount: Animated.Value,
  initialOffset: ?{| x: number, y: number |},
|};

export default class TabBar<T: *> extends React.Component<Props<T>, State> {
  static defaultProps = {
    getLabelText: ({ route }: Scene<T>) =>
      typeof route.title === 'string' ? route.title.toUpperCase() : route.title,
    getAccessible: ({ route }: Scene<T>) =>
      typeof route.accessible !== 'undefined' ? route.accessible : true,
    getAccessibilityLabel: ({ route }: Scene<T>) => route.accessibilityLabel,
    getTestID: ({ route }: Scene<T>) => route.testID,
  };

  constructor(props: Props<T>) {
    super(props);

    const initialOffset =
      this.props.scrollEnabled && this.props.layout.width
        ? {
            x: this._getScrollAmount(
              this.props,
              this.props.navigationState.index
            ),
            y: 0,
          }
        : undefined;

    this.state = {
      scrollAmount: new Animated.Value(0),
      initialOffset,
    };
  }

  componentDidUpdate(prevProps: Props<T>) {
    if (
      prevProps.navigationState.routes.length !==
        this.props.navigationState.routes.length ||
      prevProps.layout.width !== this.props.layout.width
    ) {
      this._resetScroll(this.props.navigationState.index, false);
    } else if (
      prevProps.navigationState.index !== this.props.navigationState.index
    ) {
      this._resetScroll(this.props.navigationState.index);
    }
  }

  _scrollView: ?ScrollView;
  _isIntial: boolean = true;
  _isManualScroll: boolean = false;
  _isMomentumScroll: boolean = false;
  _scrollResetCallback: AnimationFrameID;

  _renderIndicator = (props: IndicatorProps<T>) => {
    if (typeof this.props.renderIndicator !== 'undefined') {
      return this.props.renderIndicator(props);
    }

    const { width, position, navigationState } = props;
    const { routes } = navigationState;
    const translateX = Animated.multiply(
      Animated.multiply(
        Animated.interpolate(position, {
          inputRange: [0, routes.length - 1],
          outputRange: [0, routes.length - 1],
          extrapolate: 'clamp',
        }),
        width
      ),
      I18nManager.isRTL ? -1 : 1
    );

    return (
      <Animated.View
        style={[
          styles.indicator,
          { width: `${100 / routes.length}%` },
          // If layout is not available, use `left` property for positioning the indicator
          // This avoids rendering delay until we are able to calculate translateX
          width
            ? { transform: [{ translateX }] }
            : { left: `${(100 / routes.length) * navigationState.index}%` },
          this.props.indicatorStyle,
        ]}
      />
    );
  };

  _getTabWidth = props => {
    const { layout, navigationState, tabStyle } = props;
    const flattened = StyleSheet.flatten(tabStyle);

    if (flattened) {
      switch (typeof flattened.width) {
        case 'number':
          return flattened.width;
        case 'string':
          if (flattened.width.endsWith('%')) {
            const width = parseFloat(flattened.width);
            if (Number.isFinite(width)) {
              return layout.width * (width / 100);
            }
          }
      }
    }

    if (props.scrollEnabled) {
      return (layout.width / 5) * 2;
    }

    return layout.width / navigationState.routes.length;
  };

  _handleTabPress = ({ route }: Scene<*>) => {
    if (this.props.onTabPress) {
      this.props.onTabPress({ route });
    }

    this.props.jumpTo(route.key);
  };

  _handleTabLongPress = ({ route }: Scene<*>) => {
    if (this.props.onTabLongPress) {
      this.props.onTabLongPress({ route });
    }
  };

  _normalizeScrollValue = (props, value) => {
    const { layout, navigationState } = props;
    const tabWidth = this._getTabWidth(props);
    const tabBarWidth = Math.max(
      tabWidth * navigationState.routes.length,
      layout.width
    );
    const maxDistance = tabBarWidth - layout.width;

    return Math.max(Math.min(value, maxDistance), 0);
  };

  _getScrollAmount = (props, i) => {
    const { layout } = props;
    const tabWidth = this._getTabWidth(props);
    const centerDistance = tabWidth * (i + 1 / 2);
    const scrollAmount = centerDistance - layout.width / 2;

    return this._normalizeScrollValue(props, scrollAmount);
  };

  _adjustScroll = (value: number) => {
    if (this.props.scrollEnabled) {
      cancelAnimationFrame(this._scrollResetCallback);

      this._scrollView &&
        this._scrollView.scrollTo({
          x: this._normalizeScrollValue(
            this.props,
            this._getScrollAmount(this.props, value)
          ),
          animated: !this._isIntial, // Disable animation for the initial render
        });

      this._isIntial = false;
    }
  };

  _resetScroll = (value: number, animated = true) => {
    if (this.props.scrollEnabled) {
      cancelAnimationFrame(this._scrollResetCallback);

      this._scrollResetCallback = requestAnimationFrame(() => {
        this._scrollView &&
          this._scrollView.scrollTo({
            x: this._getScrollAmount(this.props, value),
            animated,
          });
      });
    }
  };

  _handleBeginDrag = () => {
    // onScrollBeginDrag fires when user touches the ScrollView
    this._isManualScroll = true;
    this._isMomentumScroll = false;
  };

  _handleEndDrag = () => {
    // onScrollEndDrag fires when user lifts his finger
    // onMomentumScrollBegin fires after touch end
    // run the logic in next frame so we get onMomentumScrollBegin first
    requestAnimationFrame(() => {
      if (this._isMomentumScroll) {
        return;
      }
      this._isManualScroll = false;
    });
  };

  _handleMomentumScrollBegin = () => {
    // onMomentumScrollBegin fires on flick, as well as programmatic scroll
    this._isMomentumScroll = true;
  };

  _handleMomentumScrollEnd = () => {
    // onMomentumScrollEnd fires when the scroll finishes
    this._isMomentumScroll = false;
    this._isManualScroll = false;
  };

  render() {
    const {
      position,
      layout,
      navigationState,
      scrollEnabled,
      bounces,
    } = this.props;
    const { routes } = navigationState;
    const tabWidth = this._getTabWidth(this.props);
    const tabBarWidth = tabWidth * routes.length;
    const translateX = Animated.multiply(this.state.scrollAmount, -1);

    return (
      <Animated.View style={[styles.tabBar, this.props.style]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicatorContainer,
            scrollEnabled
              ? { width: tabBarWidth, transform: [{ translateX }] }
              : null,
          ]}
        >
          {this._renderIndicator({
            ...this.props,
            width: tabWidth,
          })}
        </Animated.View>
        <View style={styles.scroll}>
          <Animated.ScrollView
            horizontal
            keyboardShouldPersistTaps="handled"
            scrollEnabled={scrollEnabled}
            bounces={bounces}
            alwaysBounceHorizontal={false}
            scrollsToTop={false}
            showsHorizontalScrollIndicator={false}
            automaticallyAdjustContentInsets={false}
            overScrollMode="never"
            contentContainerStyle={[
              styles.tabContent,
              scrollEnabled ? null : styles.container,
            ]}
            scrollEventThrottle={1}
            onScroll={Animated.event(
              [
                {
                  nativeEvent: {
                    contentOffset: { x: this.state.scrollAmount },
                  },
                },
              ],
              { useNativeDriver: true }
            )}
            onScrollBeginDrag={this._handleBeginDrag}
            onScrollEndDrag={this._handleEndDrag}
            onMomentumScrollBegin={this._handleMomentumScrollBegin}
            onMomentumScrollEnd={this._handleMomentumScrollEnd}
            contentOffset={this.state.initialOffset}
            ref={el => (this._scrollView = el && el.getNode())}
          >
            {routes.map(route => (
              <TabBarItem
                key={route.key}
                position={position}
                layout={layout}
                scene={{ route }}
                tabWidth={tabWidth}
                navigationState={navigationState}
                scrollEnabled={scrollEnabled}
                getAccessibilityLabel={this.props.getAccessibilityLabel}
                getAccessible={this.props.getAccessible}
                getLabelText={this.props.getLabelText}
                getTestID={this.props.getTestID}
                renderBadge={this.props.renderBadge}
                renderIcon={this.props.renderIcon}
                renderLabel={this.props.renderLabel}
                tabStyle={this.props.tabStyle}
                labelStyle={this.props.labelStyle}
                pressColor={this.props.pressColor}
                pressOpacity={this.props.pressOpacity}
                onTabPress={this._handleTabPress}
                onTabLongPress={this._handleTabLongPress}
              />
            ))}
          </Animated.ScrollView>
        </View>
      </Animated.View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    overflow: Platform.OS === 'web' ? ('auto': any) : 'scroll',
  },
  tabBar: {
    backgroundColor: '#2196f3',
    elevation: 4,
    shadowColor: 'black',
    shadowOpacity: 0.1,
    shadowRadius: StyleSheet.hairlineWidth,
    shadowOffset: {
      height: StyleSheet.hairlineWidth,
    },
    // We don't need zIndex on Android, disable it since it's buggy
    zIndex: Platform.OS === 'android' ? 0 : 1,
  },
  tabContent: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
  },
  indicatorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  indicator: {
    backgroundColor: '#ffeb3b',
    position: 'absolute',
    left: 0,
    bottom: 0,
    right: 0,
    height: 2,
  },
});
