import {
  AspectRatio,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Image,
  Text,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { useMemo } from 'react';
import { FaHeart } from 'react-icons/fa';
import {
  CutDocument,
  CutQuery,
  CutQueryVariables,
  useVoteMutation,
  useMeQuery,
} from '../../generated/graphql';

interface MovieCutDetailProps {
  cutImg: string;
  cutId: number;
  isVoted?: boolean;
  votesCount?: number;
}
export function FilmCutDetail({
  cutImg,
  cutId,
  isVoted = false,
  votesCount = 0,
}: MovieCutDetailProps): JSX.Element {
  const toast = useToast();
  const voteButtonColor = useColorModeValue('gray.500', 'gray.400');
  const [vote, { loading: voteLoading }] = useVoteMutation({
    variables: { cutId },
    // 뮤테이션 요청 이후 캐시 지우거나 덮어씌우는 등 캐시 조절 가능
    update: (cache, fetchResult) => {
      // 캐시에서 cut 쿼리 데이터 조회
      const currentCut = cache.readQuery<CutQuery, CutQueryVariables>({
        query: CutDocument,
        variables: { cutId },
      });
      if (currentCut && currentCut.cut) {
        if (fetchResult.data?.vote) {
          // cut 쿼리 데이터 설정
          cache.writeQuery<CutQuery, CutQueryVariables>({
            query: CutDocument,
            variables: { cutId: currentCut.cut.id },
            data: {
              __typename: 'Query',
              ...currentCut,
              cut: {
                ...currentCut.cut,
                votesCount: isVoted
                  ? currentCut.cut.votesCount - 1
                  : currentCut.cut.votesCount + 1,
                isVoted: !isVoted,
              },
            },
          });
        }
      }
    },
  });

  const accessToken = localStorage.getItem('access_token');
  const { data: userData } = useMeQuery({ skip: !accessToken });
  const isLoggedIn = useMemo(() => {
    if (accessToken) return userData?.me?.id;
    return false;
  }, [accessToken, userData?.me?.id]);
  return (
    <Box>
      <AspectRatio ratio={16 / 9}>
        <Image src={cutImg} objectFit="cover" fallbackSrc="" />
      </AspectRatio>

      <Box py={4}>
        <Flex justify="space-between" alignItems="center">
          <Heading size="sm">{cutId} 번째 사진</Heading>
          <HStack spacing={1} alignItems="center">
            <Button
              color={isVoted ? 'pink.400' : voteButtonColor}
              aria-label="like-this-cut-button"
              leftIcon={<FaHeart />}
              isLoading={voteLoading}
              onClick={() => {
                if (isLoggedIn) vote();
                else {
                  toast({
                    status: 'warning',
                    description: '좋아요는 로그인 후 가능합니다',
                  });
                }
              }}
            >
              <Text>{votesCount}</Text>
            </Button>
            <Button colorScheme="teal">감상남기기</Button>
          </HStack>
        </Flex>
      </Box>
    </Box>
  );
}
