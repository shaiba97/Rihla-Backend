import {
  ExceptionFilter,
  Catch,
  BadRequestException,
  ArgumentsHost,
} from '@nestjs/common';
import { MulterError } from 'multer';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    if (exception.code === 'LIMIT_FILE_SIZE') {
      throw new BadRequestException('حجم الملف كبير جدًا — الحد الأقصى 5 ميجابايت');
    }
    if (exception.code === 'LIMIT_UNEXPECTED_FILE') {
      throw new BadRequestException('حقل الملف غير متوقع');
    }
    throw new BadRequestException('خطأ في رفع الملف: ' + exception.message);
  }
}
