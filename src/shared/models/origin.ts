import * as Rt from 'runtypes';

export type LocalOrigin = {
  type: 'local';
  filePath: string;
};
export type ClusterOrigin = {
  type: 'cluster';
  context: string;
};
export type HelmOrigin = {
  type: 'helm';
  chartId: string;
  valuesFilePath: string;
};
export type KustomizeOrigin = {
  type: 'kustomize';
  kustomizationId: string;
};
// TODO: the ClusterOrigin should probably be removed from here after we stop supporting only one preview at a time
export type PreviewOrigin = HelmOrigin | KustomizeOrigin | ClusterOrigin;
export type AnyOrigin = LocalOrigin | ClusterOrigin | HelmOrigin | KustomizeOrigin;

export const LocalOriginRuntype: Rt.Runtype<LocalOrigin> = Rt.Record({
  type: Rt.Literal('local'),
  filePath: Rt.String,
});
export const ClusterOriginRuntype: Rt.Runtype<ClusterOrigin> = Rt.Record({
  type: Rt.Literal('cluster'),
  context: Rt.String,
});
export const HelmOriginRuntype: Rt.Runtype<HelmOrigin> = Rt.Record({
  type: Rt.Literal('helm'),
  chartId: Rt.String,
  valuesFilePath: Rt.String,
});
export const KustomizeOriginRuntype: Rt.Runtype<KustomizeOrigin> = Rt.Record({
  type: Rt.Literal('kustomize'),
  kustomizationId: Rt.String,
});

const PreviewOriginRuntype: Rt.Runtype<PreviewOrigin> = Rt.Union(
  ClusterOriginRuntype,
  HelmOriginRuntype,
  KustomizeOriginRuntype
);

export const AnyOriginRuntype: Rt.Runtype<AnyOrigin> = Rt.Union(
  LocalOriginRuntype,
  ClusterOriginRuntype,
  HelmOriginRuntype,
  KustomizeOriginRuntype
);

export const isLocalOrigin = LocalOriginRuntype.guard;
export const isClusterOrigin = ClusterOriginRuntype.guard;
export const isHelmOrigin = HelmOriginRuntype.guard;
export const isKustomizeOrigin = KustomizeOriginRuntype.guard;
export const isPreviewOrigin = PreviewOriginRuntype.guard;
export const isAnyOrigin = AnyOriginRuntype.guard;
