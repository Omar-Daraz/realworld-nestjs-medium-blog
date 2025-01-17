import { ApiProperty } from '@nestjs/swagger';

export class Tag {
  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  name: string;

  // @custom-inject-point
  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}
