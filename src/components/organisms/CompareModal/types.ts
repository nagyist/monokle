export type ComparisonListItem = HeaderItemProps | ComparisonItemProps;

export type HeaderItemProps = {
  type: 'header';
  kind: string;
  count: number;
};

export type ComparisonItemProps = {
  type: 'comparison';
  id: string;
  namespace: string | undefined;
  name: string;
  leftActive: boolean;
  rightActive: boolean;
  canDiff: boolean;
};
