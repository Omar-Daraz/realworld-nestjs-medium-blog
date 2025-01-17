import {
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtPayloadType } from '@src/auth/strategies/types/jwt-payload.type';
import { UsersService } from '@src/users/users.service';
import { IPaginationOptions } from '@src/utils/types/pagination-options';

import { Comment } from './domain/comment';
import { CommentRepository } from './infrastructure/persistence/comment.repository';

@Injectable()
export class CommentsService {
  constructor(
    private readonly commentRepository: CommentRepository,
    private userService: UsersService,
  ) {}

  async create(
    article_id: Comment['article_id'],
    body: Comment['body'],
    userJwtPayload: JwtPayloadType,
  ) {
    const clonedPayload = {
      article_id,
      body,
      author_id: userJwtPayload.id,
    };

    const comment = await this.commentRepository.create(clonedPayload);

    const user = await this.userService.findById(userJwtPayload.id);

    if (user) {
      comment.author = user;
    }

    return comment;
  }

  findAllWithPagination({
    paginationOptions,
    article_id,
  }: {
    paginationOptions: IPaginationOptions;
    article_id: Comment['article_id'];
  }) {
    return this.commentRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
      article_id,
    });
  }

  async validateAndFetchComment(id: Comment['id']) {
    const comment = await this.commentRepository.findById(id);

    if (!comment) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        errors: {
          id: 'Comment not found',
        },
      });
    }

    return comment;
  }

  async remove(id: Comment['id'], userJwtPayload: JwtPayloadType) {
    const comment = await this.validateAndFetchComment(id);

    if (comment?.author?.id !== userJwtPayload.id) {
      throw new UnauthorizedException({
        status: HttpStatus.UNAUTHORIZED,
        errors: {
          id: 'Not unauthorized to delete the comment',
        },
      });
    }

    return this.commentRepository.remove(id);
  }
}
