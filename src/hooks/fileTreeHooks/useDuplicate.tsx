import {useCallback} from 'react';

import {useAppDispatch} from '@redux/hooks';
import {setAlert} from '@redux/reducers/alert';

import {duplicateEntity} from '@utils/files';

import {AlertEnum} from '@shared/models/alert';

export const useDuplicate = () => {
  const dispatch = useAppDispatch();

  const onDuplicate = useCallback(
    (absolutePathToEntity: string, entityName: string, dirName: string) => {
      duplicateEntity(absolutePathToEntity, entityName, dirName, args => {
        const {duplicatedFileName, err} = args;

        if (err) {
          dispatch(
            setAlert({
              title: 'Duplication failed',
              message: `Something went wrong during duplicating "${absolutePathToEntity}"`,
              type: AlertEnum.Error,
            })
          );
        } else {
          dispatch(
            setAlert({
              title: `Duplication succeded`,
              message: `You have successfully created ${duplicatedFileName}`,
              type: AlertEnum.Success,
            })
          );
        }
      });
    },
    [dispatch]
  );

  return {onDuplicate};
};
