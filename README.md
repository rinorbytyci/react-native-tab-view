# React Native Tab View

[![Build Status][build-badge]][build]
[![Version][version-badge]][package]
[![MIT License][license-badge]][license]

A cross-platform Tab View component for React Native.

- [Run the example app to see it in action](https://expo.io/@satya164/react-native-tab-view-demos).
- Checkout the [example/](https://github.com/react-native-community/react-native-tab-view/tree/master/example) folder for source code.

## Features

- Smooth animations and gestures
- Scrollable tabs
- Supports both top and bottom tab bars
- Follows Material Design spec
- Highly customizable
- Fully typed with [Flow](https://flow.org/)

## Demo

<a href="https://raw.githubusercontent.com/satya164/react-native-tab-view/master/demo/demo.mp4"><img src="https://raw.githubusercontent.com/satya164/react-native-tab-view/master/demo/demo.gif" width="360"></a>

## Installation

Open a Terminal in the project root and run:

```sh
yarn add react-native-tab-view
```

You also need to install and link [react-native-gesture-handler](https://github.com/kmagiera/react-native-gesture-handler) and [react-native-reanimated](https://github.com/kmagiera/react-native-reanimated). Follow the instructions on the linked repos to configure them. This step is unnecessary if you use Expo.

## Quick Start

```js
import * as React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { TabView, TabBar, SceneMap } from 'react-native-tab-view';

const FirstRoute = () => (
  <View style={[styles.scene, { backgroundColor: '#ff4081' }]} />
);
const SecondRoute = () => (
  <View style={[styles.scene, { backgroundColor: '#673ab7' }]} />
);

export default class TabViewExample extends React.Component {
  state = {
    index: 0,
    routes: [
      { key: 'first', title: 'First' },
      { key: 'second', title: 'Second' },
    ],
  };

  render() {
    return (
      <TabView
        navigationState={this.state}
        renderScene={SceneMap({
          first: FirstRoute,
          second: SecondRoute,
        })}
        onIndexChange={index => this.setState({ index })}
        initialLayout={{ width: Dimensions.get('window').width }}
      />
    );
  }
}

const styles = StyleSheet.create({
  scene: {
    flex: 1,
  },
});
```

[Try this example on Snack](https://snack.expo.io/@satya164/react-native-tab-view-quick-start)

## More examples on Snack

- [Custom Tab Bar](https://snack.expo.io/@satya164/react-native-tab-view-custom-tabbar)
- [Lazy Load](https://snack.expo.io/@satya164/react-native-tab-view-lazy-load)

## Integration with React Navigation

React Navigation integration can be achieved by the [react-navigation-tabs](https://github.com/react-navigation/react-navigation-tabs) package. Note that while it's easier to use, it is not as flexible as using the library directly.

## API reference

The package exports a `TabView` component which is the one you'd use to render the tab view, and a `TabBar` component which is the default tab bar implementation.

### `<TabView />`

Container component responsible for rendering and managing tabs. Follows material design styles by default.

#### Example

```js
<TabView
  navigationState={this.state}
  onIndexChange={index => this.setState({ index })}
  renderScene={SceneMap({
    first: FirstRoute,
    second: SecondRoute,
  })}
/>
```

#### Props

- `navigationState` (required): the current navigation state, should contain a `routes` array containing the list of tabs, and an `index` property representing the current tab.
- `onIndexChange` (required): callback for when the current tab index changes, should update the navigation state.
- `renderScene` (required): callback which returns a React Element to use as the scene for a tab.
- `renderTabBar`: callback which returns a custom React Element to use as the tab bar.
- `canJumpToTab`: callback which returns a boolean indicating whether jumping to the tab is allowed.
- `swipeEnabled`: whether to enable swipe gestures.
- `swipeDistanceThreshold`: minimum swipe distance to trigger page switch.
- `swipeVelocityThreshold`: minimum swipe velocity to trigger page switch.
- `initialLayout`: object containing the initial `height` and `width`, can be passed to prevent the one frame delay in rendering.
- `tabBarPosition`: position of the tab bar, `'top'` or `'bottom'`. Defaults to `'top'`.

### `<TabBar />`

Material design themed tab bar. To pass props to the tab bar, you'd need to use the `renderTabBar` prop of `TabView` to render the `TabBar` and pass additional props.

#### Example

```js
renderTabBar={props =>
  <TabBar
    {...props}
    indicatorStyle={{ backgroundColor: 'pink' }}
  />
}
```

#### Props

- `getLabelText`: callback which returns the label text to use for a tab. Defaults to uppercased route title.
- `getAccessible`: callback which returns a boolean to indicate whether to mark a tab as `accessible`. Defaults to `true`.
- `getAccessibilityLabel`: callback which returns an accessibility label for the tab. Defaults to route title.
- `getTestID`: callback which returns a test id for the tab.
- `renderIcon`: callback which returns a custom React Element to be used as a icon.
- `renderLabel`: callback which returns a custom React Element to be used as a label.
- `renderIndicator`: callback which returns a custom React Element to be used as a tab indicator.
- `renderBadge`: callback which returns a custom React Element to be used as a badge.
- `onTabPress`: callback invoked on tab press, useful for things like scroll to top.
- `onTabLongPress`: callback invoked on tab long-press, for example to show a drawer with more options.
- `pressColor`: color for material ripple (Android >= 5.0 only).
- `pressOpacity`: opacity for pressed tab (iOS and Android < 5.0 only).
- `scrollEnabled`: whether to enable scrollable tabs.
- `bounces`: whether the tab bar bounces when scrolling.
- `tabStyle`: style object for the individual tabs in the tab bar.
- `indicatorStyle`: style object for the active indicator.
- `labelStyle`: style object for the tab item label.
- `style`: style object for the tab bar.

### `SceneMap`

Helper function which takes an object with the mapping of `route.key` to React components and returns a function to use with `renderScene` prop.

```js
renderScene = SceneMap({
  first: FirstRoute,
  second: SecondRoute,
});
```

Each scene receives the following props:

- `route`: the current route rendered by the component
- `jumpTo`: method to jump to other tabs, takes a `route.key` as it's argument

All the scenes rendered with `SceneMap` are optimized using `React.PureComponent` and don't re-render when parent's props or states change. If you don't want this behaviour, or want to pass additional props to your scene components, use `renderScene` directly instead of using `SceneMap`.

```js
renderScene = ({ route }) => {
  switch (route.key) {
    case 'first':
      return <FirstRoute />;
    case 'second':
      return <SecondRoute />;
    default:
      return null;
  }
}
```

If you don't use `SceneMap`, you will need to take care of optimizing the individual scenes.

_IMPORTANT:_ **Do not** pass inline functions to `SceneMap`, for example, don't do the following:

```js
SceneMap({
  first: () => <FirstRoute foo={this.props.foo} />,
  second: SecondRoute,
});
```

Always define your components elsewhere in the top level of the file. If you pass inline functions, it'll re-create the component every render, which will cause the entire route to unmount and remount every change. It's very bad for performance and will also cause any local state to be lost.

## Known Issues

- `TabView` cannot be nested inside another `TabView` or a horizontal `ScrollView` on Android. This is a limitation of the platform and we cannot fix it in the library.

## Optimization Tips

### Avoid unnecessary re-renders

The `renderScene` function is called every time the index changes. If your `renderScene` function is expensive, it's good idea move each route to a separate component if they don't depend on the index, and apply `shouldComponentUpdate` in your route components to prevent unnecessary re-renders.

For example, instead of:

```js
renderScene = ({ route }) => {
  switch (route.key) {
    case 'home':
      return (
        <View style={styles.page}>
          <Avatar />
          <NewsFeed />
        </View>
      );
    default:
      return null;
  }
};
```

Do the following:

```js
renderScene = ({ route }) => {
  switch (route.key) {
    case 'home':
      return <HomeComponent />;
    default:
      return null;
  }
};
```

Where `<HomeComponent />` is a `PureComponent`:

```js
export default class HomeComponent extends React.PureComponent {
  render() {
    return (
      <View style={styles.page}>
        <Avatar />
        <NewsFeed />
      </View>
    )
  }
}
```

### Avoid one frame delay

We need to measure the width of the container and hence need to wait before rendering some elements on the screen. If you know the initial width upfront, you can pass it in and we won't need to wait for measuring it. Most of the time, it's just the window width.

For example, pass the following `initialLayout` to `TabView`:

```js
const initialLayout = {
  height: 0,
  width: Dimensions.get('window').width,
};
```

The tab view will still react to changes in the dimension and adjust accordingly to accommodate things like orientation change.

### Optimize large number of routes

If you've a large number of routes, especially images, it can slow the animation down a lot. You can instead render a limited number of routes.

For example, do the following to render only 2 routes on each side:

```js
renderScene = ({ route }) => {
  if (Math.abs(this.state.index - this.state.routes.indexOf(route)) > 2) {
    return <View />;
  }

  return <MySceneComponent route={route} />;
};
```

### Avoid rendering TabView inside ScrollView

Nesting the `TabView` inside a vertical `ScrollView` will disable the optimizations in the `FlatList` components rendered inside the `TabView`. So avoid doing it if possible.

## Contributing

While developing, you can run the [example app](/example/README.md) to test your changes.

Make sure the tests still pass, and your code passes Flow and ESLint. Run the following to verify:

```sh
yarn test
yarn flow
yarn lint
```

To fix formatting errors, run the following:

```sh
yarn lint -- --fix
```

Remember to add tests for your change if possible.

<!-- badges -->

[build-badge]: https://img.shields.io/circleci/project/github/react-native-community/react-native-tab-view/master.svg?style=flat-square
[build]: https://circleci.com/gh/react-native-community/react-native-tab-view
[version-badge]: https://img.shields.io/npm/v/react-native-tab-view.svg?style=flat-square
[package]: https://www.npmjs.com/package/react-native-tab-view
[license-badge]: https://img.shields.io/npm/l/react-native-tab-view.svg?style=flat-square
[license]: https://opensource.org/licenses/MIT
