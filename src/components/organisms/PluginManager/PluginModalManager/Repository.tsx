import {useEffect, useState} from 'react';

import {Space, Typography} from 'antd';
import {Radio} from 'antd';

import {api} from './api';
import {Container, FilterList, IssueList, Loading, Owner, OwnerProfile, PageNav, RepoInfo} from './styles';

interface Owner {
  html_url: string;
  avatar_url: string;
  login: string;
  stargazers_count: string;
}

interface Repo {
  owner: Owner;
  license: {name: string};
  html_url: string;
  stargazers_count: string;
  name: string;
  forks_count: string;
  forks: string;
  description: string;
}

interface Filters {
  state: string;
  label: string;
  active: boolean;
}

interface Branch {
  name: string;
  id: string;
}

enum Action {
  next = 'next',
  back = 'back',
}

const {Title} = Typography;

export const Repository = ({repoName}: {repoName: string}) => {
  const [state, setComponentState] = useState<
    | {
        repo: Repo;
        loading: boolean;
        filters: [Filters];
        filterIndex: number;
        page: number;
        branches: Branch[] | null;
      }
    | undefined
  >({
    repo: {},
    loading: true,
    filters: [{state: 'all', label: 'All Branches', active: true}],
    filterIndex: 0,
    page: 1,
    branches: [],
  });

  const fetchRepo: any = async (filters: Filters[] | [] = []) => {
    const res = await Promise.all([
      await api(`/repos/${repoName}`),
      await api(`/repos/${repoName}/branches`, {
        params: {
          state: filters.find(filter => filter.active).state,
          per_page: 8,
        },
      }),
    ]);
    return res;
  };

  useEffect(() => {
    const {filters} = state;
    const [repo, branches] = fetchRepo(filters);

    setComponentState({
      ...state,
      repo: repo.data,
      branches: branches.data,
      loading: false,
    });
  }, []);

  const loadFilters = async () => {
    const {page} = state;

    const branches: any = await api(`/repos/${repoName}/branches`, {
      params: {
        per_page: 4,
        page,
      },
    });

    setComponentState({...state, branches: branches.data});
  };

  const handlePage = async (action: Action) => {
    const {page} = state;
    await setComponentState({...state, page: action === 'back' ? page - 1 : page + 1});
    loadFilters();
  };

  const {repo, loading, filters, filterIndex, page, branches} = state;

  if (loading) {
    return (
      <Container>
        <Loading loading={loading ? 1 : 0}>Loading</Loading>
      </Container>
    );
  }

  return (
    <Container>
      <Owner>
        <div>Back to Repositories</div>
        <OwnerProfile>
          <a href={repo.owner.html_url} target="_blank" rel="noopener noreferrer">
            <img src={repo.owner.avatar_url} alt={repo.owner.login} />
          </a>
          <h2>{repo.owner.login}</h2>
        </OwnerProfile>
        <RepoInfo>
          <h1>
            <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
              {repo.name}
            </a>
          </h1>
          <div>
            {repo.license && <span>{repo.license.name}</span>}
            {repo.stargazers_count !== '0' && (
              <span>
                {`${Number(repo.stargazers_count).toLocaleString(undefined, {
                  minimumIntegerDigits: 2,
                })} ${repo.stargazers_count === '1' ? 'star' : 'stars'}`}
              </span>
            )}
            {repo.forks !== 0 && (
              <span>{`${Number(repo.forks_count).toLocaleString()} ${
                repo.forks_count === '1' ? 'fork' : 'forks'
              }`}</span>
            )}
          </div>
          <p>{repo.description}</p>
        </RepoInfo>
      </Owner>

      <IssueList>
        <FilterList active={filterIndex}>
          {filters.map(filter => (
            <button type="button" key={filter.state}>
              {filter.label}
            </button>
          ))}
        </FilterList>
        <Radio.Group>
          <Space direction="vertical">
            {branches.map((issue: Branch) => (
              <Radio key={String(issue.id)} value={issue.name}>
                <Title level={5}>{issue.name}</Title>
              </Radio>
            ))}
          </Space>
        </Radio.Group>

        <PageNav>
          <button type="button" disabled={page < 2} onClick={() => handlePage('back')}>
            Prev. Page
          </button>
          <button type="button" onClick={() => handlePage('next')}>
            Next Page
          </button>
        </PageNav>
      </IssueList>
    </Container>
  );
};
