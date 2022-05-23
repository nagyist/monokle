import React from 'react';

import {Button, Tooltip} from 'antd';

import {SwapOutlined} from '@ant-design/icons';

import {TOOLTIP_DELAY} from '@constants/constants';

import {useAppDispatch} from '@redux/hooks';
import {ComparisonView, compareToggled} from '@redux/reducers/compare';

export const CompareButton: React.FC = ({children}) => {
  const dispatch = useAppDispatch();

  const onClickClusterComparison = () => {
    const defaultView: ComparisonView = {
      leftSet: {
        type: 'local',
      },
      rightSet: {
        type: 'cluster',
        context: 'minikube',
      },
    };
    dispatch(compareToggled({value: true, initialView: defaultView}));
  };

  return (
    <Tooltip mouseEnterDelay={TOOLTIP_DELAY} title="Compare resources" placement="bottom">
      <Button
        onClick={onClickClusterComparison}
        icon={<SwapOutlined />}
        type="primary"
        ghost
        size="small"
        style={{marginLeft: 8}}
      >
        {children}
      </Button>
    </Tooltip>
  );
};
