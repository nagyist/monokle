import {handleIpc} from '../../utils/ipc';
import {
  checkoutGitBranch,
  cloneGitRepo,
  commitChanges,
  createLocalBranch,
  deleteLocalBranch,
  fetchRepo,
  getAheadBehindCommitsCount,
  getBranchCommits,
  getGitRemotePath,
  initGitRepo,
  isFolderGitRepo,
  isGitInstalled,
  publishLocalBranch,
  pullChanges,
  pushChanges,
  setRemote,
  stageChangedFiles,
  unstageFiles,
} from './handlers';

handleIpc('git:checkoutGitBranch', checkoutGitBranch);
handleIpc('git:cloneGitRepo', cloneGitRepo);
handleIpc('git:commitChanges', commitChanges);
handleIpc('git:createLocalBranch', createLocalBranch);
handleIpc('git:deleteLocalBranch', deleteLocalBranch);
handleIpc('git:fetchRepo', fetchRepo);
handleIpc('git:getAheadBehindCommitsCount', getAheadBehindCommitsCount);
handleIpc('git:getBranchCommits', getBranchCommits);
handleIpc('git:getGitRemotePath', getGitRemotePath);
handleIpc('git:initGitRepo', initGitRepo);
handleIpc('git:isFolderGitRepo', isFolderGitRepo);
handleIpc('git:isGitInstalled', isGitInstalled);
handleIpc('git:publishLocalBranch', publishLocalBranch);
handleIpc('git:pullChanges', pullChanges);
handleIpc('git:pushChanges', pushChanges);
handleIpc('git:setRemote', setRemote);
handleIpc('git:stageChangedFiles', stageChangedFiles);
handleIpc('git:unstageFiles', unstageFiles);
