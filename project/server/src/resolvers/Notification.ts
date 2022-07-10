import {
  Arg,
  Ctx,
  Mutation,
  Query,
  Resolver,
  UseMiddleware,
  Int,
  ResolverFilterData,
  Root,
  Subscription,
  Publisher,
  PubSub,
} from 'type-graphql';
import { MyContext } from '../apollo/createApolloServer';
import Notification from '../entities/Notification';
import { isAuthenticated } from '../middlewares/isAuthenticated';

@Resolver(Notification)
export class NotificationResolver {
  @Subscription({ topics: 'NOTIFICATION_CREATED' }) // 요청에서 구독할 이벤트 이름
  newNotification(@Root() notificationPayload: Notification): Notification {
    return notificationPayload;
  }

  @Query(() => [Notification], {
    description: '세션에 해당되는 유저의 모든 알림을 가져옴',
  })
  @UseMiddleware(isAuthenticated)
  async notifications(
    @Ctx() { verifiedUser }: MyContext,
  ): Promise<Notification[]> {
    const notifications = await Notification.find({
      where: { userId: verifiedUser.userId },
      order: { createdAt: 'DESC' },
    });
    return notifications;
  }

  @UseMiddleware(isAuthenticated)
  @Mutation(() => Notification)
  async createNotification(
    @Arg('userId', () => Int) userId: number,
    @Arg('text') text: string,
    @PubSub('NOTIFICATION_CREATED') publish: Publisher<Notification>,
  ): Promise<Notification> {
    const newNoti = await Notification.create({
      text,
      userId,
    }).save();
    await publish(newNoti); // 알림 생성 이벤트 발생
    return newNoti;
  }
}
