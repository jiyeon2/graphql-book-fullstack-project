import { execute, GraphQLSchema, subscribe } from 'graphql';
import http from 'http';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { JwtVerifiedUser, verifyAccessToken } from '../utils/jwt-auth';

export interface MySubscriptionContext {
  verifiedUser: JwtVerifiedUser | null;
}
export const createSubscriptionServer = async (
  schema: GraphQLSchema,
  server: http.Server,
): Promise<SubscriptionServer> => {
  return SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe,
      onConnect: (connectionParams: any) => {
        // WebSocketLink에서 전송한 connectionParams의 값이 들어옴
        const accessToken = connectionParams.Authorization.split(' ')[1];
        // 반환값이 SubscriptionFilter의 context로 전달됨
        return { verifiedUser: verifyAccessToken(accessToken) };
      },
      onDisconnect: () => {
        console.log('disconnected');
      },
    },
    { server, path: '/graphql' },
  );
};
