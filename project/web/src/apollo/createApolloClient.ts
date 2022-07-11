import {
  ApolloClient,
  from,
  fromPromise,
  NormalizedCacheObject,
  split,
} from '@apollo/client';
import { WebSocketLink } from '@apollo/client/link/ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { createUploadLink } from 'apollo-upload-client';
import { refreshAccessToken } from './auth';
import { createApolloCache } from './createApolloCache';

let apolloClient: ApolloClient<NormalizedCacheObject>;

const errorLink = onError(
  // eslint-disable-next-line consistent-return
  ({ graphQLErrors, networkError, operation, forward }) => {
    if (graphQLErrors) {
      if (graphQLErrors.find((err) => err.message === 'access token expired')) {
        return fromPromise(refreshAccessToken(apolloClient, operation))
          .filter((result) => !!result)
          .flatMap(() => forward(operation));
      }

      graphQLErrors.forEach(({ message, locations, path }) =>
        // eslint-disable-next-line no-console
        console.log(
          `[GrapyQL error]: -> ${operation.operationName}
      Message: ${message}, Query: ${path}, Locations: ${JSON.stringify(
            locations,
          )}`,
        ),
      );

      if (networkError) {
        // eslint-disable-next-line no-console
        console.log(`[networkError]: -> ${operation.operationName}
      Message: ${networkError.message}`);
      }
    }
  },
);

const httpUploadLink = createUploadLink({
  // uri: 'http://localhost:4000/graphql',
  uri: `${process.env.REACT_APP_API_HOST}/graphql`,
  fetchOptions: {
    credentials: 'include',
  },
});

const authLink = setContext((request, prevContext) => {
  const accessToken = localStorage.getItem('access_token');
  return {
    headers: {
      ...prevContext.headers,
      Authorization: accessToken ? `Bearer ${accessToken}` : '',
    },
  };
});

const wsLink = new WebSocketLink({
  // uri: 'ws://localhost:4000/graphql',
  uri: `${process.env.REACT_APP_API_SUBSCRIPTION_HOST}/graphql`,
  options: {
    reconnect: true,
    connectionParams: () => {
      const accessToken = localStorage.getItem('access_token');
      return {
        Authorization: accessToken ? `Bearer ${accessToken}` : '',
      };
    },
  },
});

// subscription 요청만 wsLink 통해 Subscription서버로 요청
// 쿼리와 뮤테이션은 기본서버로 요청
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  from([wsLink]), // 첫번째 인자값이 true인경우 적용되는 링크
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from([authLink, errorLink, httpUploadLink as any]), // 첫번째 인자값이 false인 경우 적용되는 링크
);

export const createApolloClient = (): ApolloClient<NormalizedCacheObject> => {
  apolloClient = new ApolloClient({
    cache: createApolloCache(),
    // uri: 'http://localhost:4000/graphql',
    uri: `${process.env.REACT_APP_API_HOST}/graphql`,
    link: splitLink,
  });
  return apolloClient;
};
