/* @flow */

export type Route = { key: string } & $Shape<{
  icon?: string,
  title?: string,
  accessibilityLabel?: string,
  testID?: string,
  [key: string]: any,
}>;

export type Scene<T> = {
  route: T,
};

export type NavigationState<T: Route> = {
  index: number,
  routes: T[],
};

export type Layout = {
  width: number,
  height: number,
};

export type SceneRendererProps<T: Route> = {
  layout: Layout,
  navigationState: NavigationState<T>,
  position: any,
  jumpTo: (key: string) => mixed,
};
