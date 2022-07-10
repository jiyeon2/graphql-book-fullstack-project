import { ApolloClient, NormalizedCacheObject, Operation } from '@apollo/client';

import {
  RefreshAccessTokenMutation,
  RefreshAccessTokenDocument,
} from '../generated/graphql';

export const refreshAccessToken = (
  _apolloClient: ApolloClient<NormalizedCacheObject>,
  operation: Operation,
): Promise<boolean> =>
  _apolloClient
    .mutate<RefreshAccessTokenMutation>({
      mutation: RefreshAccessTokenDocument,
    })
    .then(({ data }) => {
      const newAccessToken = data?.refreshAccessToken?.accessToken;
      // 새 액세스토큰이 응답되지 않은 경우 기존 액세스 토큰은 유효하지 않은것
      if (!newAccessToken) {
        localStorage.setItem('access_token', ''); // 기존 토큰 삭제
        return false;
      }
      localStorage.setItem('access_token', newAccessToken);
      const prevContext = operation.getContext();
      operation.setContext({
        headers: {
          ...prevContext.headers,
          authorization: `Bearer ${newAccessToken}`,
        },
      });
      return true;
    })
    .catch(() => {
      localStorage.setItem('access_token', '');
      return false;
    });
