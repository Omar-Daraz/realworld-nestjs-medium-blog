import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { diff, unique } from 'radash';
import slugify from 'slugify';

import { JwtPayloadType } from '@src/auth/strategies/types/jwt-payload.type';
import { CommentsService } from '@src/comments/comments.service';
import { Comment } from '@src/comments/domain/comment';
import { DatabaseHelperRepository } from '@src/database-helpers/database-helper';
import { Tag } from '@src/tags/domain/tag';
import { TagsService } from '@src/tags/tags.service';
import { UsersService } from '@src/users/users.service';
import { NullableType } from '@src/utils/types/nullable.type';
import { IPaginationOptions } from '@src/utils/types/pagination-options';

import { Article } from './domain/article';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ArticleRepository } from './infrastructure/persistence/article.repository';

@Injectable()
export class ArticlesService {
  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly commentsService: CommentsService,
    private readonly tagsService: TagsService,
    private readonly dbHelperRepository: DatabaseHelperRepository,
    private userService: UsersService,
  ) {}

  async create(
    createArticleDto: CreateArticleDto,
    userJwtPayload: JwtPayloadType,
  ): Promise<Article> {
    return this.dbHelperRepository.transactionManager.runInTransaction(
      async () =>
        this.createArticleWithTransaction(createArticleDto, userJwtPayload),
    );
  }

  private async createArticleWithTransaction(
    createArticleDto: CreateArticleDto,
    userJwtPayload: JwtPayloadType,
  ): Promise<Article> {
    const clonedPayload = {
      ...createArticleDto,
      author_id: userJwtPayload.id,
    };

    let tags: NullableType<Tag[]> = [];

    if (createArticleDto.tagList && createArticleDto.tagList.length > 0) {
      const uniqueTagList = unique(createArticleDto.tagList);

      tags = await this.tagsService.findByNames(uniqueTagList);

      const newTagNames = diff(
        uniqueTagList,
        tags?.map((tag) => tag.name) || [],
      );

      if (newTagNames.length > 0) {
        const newTags = await this.tagsService.createMany(
          this.tagsService.toCreateTagDtos(newTagNames),
        );

        tags = [...(tags || []), ...newTags];
      }
    }

    const articlePayload = {
      ...clonedPayload,
      tagList: tags,
      slug: this.slugify(createArticleDto.title),
    };

    const article = await this.articleRepository.create(articlePayload);

    return await this.validateAndFetchArticleWithRelationsById(article?.id);
  }

  slugify(title: string): string {
    const baseSlug = slugify(title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    });

    const uniqueSuffix = this.generateUniqueSuffix();

    return `${baseSlug}-${uniqueSuffix}`;
  }

  generateUniqueSuffix(length: number = 11): string {
    const charset =
      'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';
    let id = '';
    const randomValues = crypto.getRandomValues(new Uint8Array(length));

    for (let i = 0; i < length; i++) {
      id += charset[randomValues[i] & 63]; // Ensure the index is twithin the range 0-63
    }

    return id;
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.articleRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findOne(id: Article['id']) {
    return this.articleRepository.findByIdWithRelations(id);
  }

  async update(id: Article['id'], updateArticleDto: UpdateArticleDto) {
    const article = await this.validateAndFetchArticleById(id);

    const { title, ...rest } = updateArticleDto;

    const payload = {
      ...rest,
      title,
      ...(title && title !== article.title && { slug: this.slugify(title) }),
    };

    const updatedArticle = await this.articleRepository.update(
      article,
      payload,
    );

    return await this.articleRepository.findByIdWithRelations(
      updatedArticle.id,
    );
  }

  remove(id: Article['id']) {
    return this.articleRepository.remove(id);
  }

  async createComment(
    slug: Article['slug'],
    body: Comment['body'],
    userJwtPayload: JwtPayloadType,
  ) {
    const article = await this.validateAndFetchArticleBySlug(slug);

    return await this.commentsService.create(article.id, body, userJwtPayload);
  }

  async findAllCommentsWithPagination({
    paginationOptions,
    slug,
  }: {
    paginationOptions: IPaginationOptions;
    slug: Article['slug'];
  }) {
    const article = await this.validateAndFetchArticleBySlug(slug);

    return this.commentsService.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
      article_id: article.id,
    });
  }

  async validateAndFetchArticleBySlug(slug: Article['slug']): Promise<Article> {
    const article = await this.articleRepository.findBySlug(slug);

    if (!article) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        errors: {
          slug: 'Artilce not found',
        },
      });
    }

    return article;
  }

  async validateAndFetchArticleById(id: Article['id']): Promise<Article> {
    const article = await this.articleRepository.findById(id);

    if (!article) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        errors: {
          slug: 'Artilce not found',
        },
      });
    }

    return article;
  }

  async validateAndFetchArticleWithRelationsById(
    id: Article['id'],
  ): Promise<Article> {
    const article = await this.articleRepository.findByIdWithRelations(id);

    if (!article) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        errors: {
          slug: 'Artilce not found',
        },
      });
    }

    return article;
  }

  async validateArticle(slug: Article['slug']): Promise<void> {
    const article = await this.articleRepository.findBySlug(slug);

    if (!article) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        errors: {
          slug: 'Artilce not found',
        },
      });
    }
  }

  async removeComment(
    id: Comment['id'],
    slug: Article['slug'],
    userJwtPayload: JwtPayloadType,
  ) {
    await this.validateArticle(slug);

    return await this.commentsService.remove(id, userJwtPayload);
  }
}
