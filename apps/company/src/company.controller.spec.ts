import { Test, TestingModule } from '@nestjs/testing';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';

describe('CompanyController', () => {
  let companyController: CompanyController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [CompanyController],
      providers: [CompanyService],
    }).compile();

    companyController = app.get<CompanyController>(CompanyController);
  });

  it('should be defined', () => {
    expect(companyController).toBeDefined();
  });
});
