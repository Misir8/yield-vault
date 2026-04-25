import { applyDecorators } from "@nestjs/common";
import { ApiExtraModels, ApiResponse, getSchemaPath } from "@nestjs/swagger";

import { ErrorDetail } from "@libs/exceptions";
type ErrorExample = {
  title: string;
  detail: string;
};

export function ApiErrors(status: number, errors: ErrorExample[]) {
  const examples = errors.reduce(
    (acc, err) => {
      acc[err.title] = {
        value: {
          title: err.title,
          detail: err.detail,
        },
      };
      return acc;
    },
    {} as Record<string, any>,
  );

  return applyDecorators(
    ApiExtraModels(ErrorDetail),
    ApiResponse({
      status,
      description: `${status} error responses`,
      content: {
        "application/json": {
          schema: { $ref: getSchemaPath(ErrorDetail) },
          examples,
        },
      },
    }),
  );
}
