import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CreateRetainageReleaseDto } from './dto/create-retainage-release.dto';
import { ListRetainageReleasesQueryDto } from './dto/list-retainage-releases-query.dto';
import { RetainageReleaseService } from './retainage-release.service';

@Controller('retainage-releases')
export class RetainageReleaseController {
  constructor(
    private readonly retainageReleaseService: RetainageReleaseService,
  ) {}

  @Post()
  create(@Body() dto: CreateRetainageReleaseDto) {
    return this.retainageReleaseService.create(dto);
  }

  @Get()
  listByProject(@Query() query: ListRetainageReleasesQueryDto) {
    return this.retainageReleaseService.listByProject(query.projectId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.retainageReleaseService.remove(id);
  }
}
