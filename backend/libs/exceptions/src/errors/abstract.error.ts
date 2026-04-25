import { ApiProperty } from "@nestjs/swagger";

export class ErrorDetail {
  @ApiProperty({ example: "field name" })
  field?: string;

  @ApiProperty({ example: "error code" })
  message: string;

  details?: Record<string, any>;
}

export interface IAbstractError {
  details: ErrorDetail[];
}
