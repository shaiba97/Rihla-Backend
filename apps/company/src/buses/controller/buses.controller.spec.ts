import { Test, TestingModule } from '@nestjs/testing';
import { BusesController } from './buses.controller';
import { BusesService } from '../service/buses.service';
import { CreateBusDto } from '../dto/bus.dto';

describe('BusesController', () => {
  let controller: BusesController;
  let service: BusesService;

  const mockBusesService = {
    create: jest.fn(),
    getBuses: jest.fn(),
    getBusesByProperty: jest.fn(),
    getBus: jest.fn(),
    searchBus: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BusesController],
      providers: [
        { provide: BusesService, useValue: mockBusesService },
      ],
    }).compile();

    controller = module.get<BusesController>(BusesController);
    service = module.get<BusesService>(BusesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST post-bus', () => {
    it('should create a bus', async () => {
      const createDto = {} as CreateBusDto;
      
      // = {
      //   name: 'حافلة 1',
      //   chairs: 50,
      //   left: 2,
      //   right: 2,
      //   seatStartFrom: 'LEFT',
      //   plate: { arabic: 'أ', english: 'A', numbers: '123' },
      // };
      const result = { success: true, message: 'تم إنشاء الحافلة بنجاح', data: { id: '1', ...createDto } };
      mockBusesService.create.mockResolvedValue(result);

      const response = await controller.create({}, createDto);
      expect(mockBusesService.create).toHaveBeenCalledWith(createDto);
      expect(response).toEqual(result);
    });
  });

  describe('GET get-buses', () => {
    it('should return all buses', async () => {
      const result = [{ id: '1', name: 'حافلة 1' }, { id: '2', name: 'حافلة 2' }];
      mockBusesService.getBuses.mockResolvedValue(result);

      const response = await controller.getBuses();
      expect(mockBusesService.getBuses).toHaveBeenCalled();
      expect(response).toEqual(result);
    });
  });

  describe('GET get-buses/property/:property/value/:value', () => {
    it('should get buses by property (getBusesByProperty)', async () => {
      const result = [{ id: '1', name: 'حافلة 1' }];
      mockBusesService.getBusesByProperty.mockResolvedValue(result);

      const response = await controller.getBusesByProperty('name', 'حافلة 1');
      expect(mockBusesService.getBusesByProperty).toHaveBeenCalledWith('name', 'حافلة 1');
      expect(response).toEqual(result);
    });
  });

  describe('GET get-bus/property/:property/value/:value', () => {
    it('should get bus by property (getBus)', async () => {
      const result = { id: '1', name: 'حافلة 1' };
      mockBusesService.getBus.mockResolvedValue(result);

      const response = await controller.getBus('id', '1');
      expect(mockBusesService.getBus).toHaveBeenCalledWith('id', '1');
      expect(response).toEqual(result);
    });
  });

  // GET/POST search-bus endpoints are not implemented in the controller.
  // Tests were removed as they referenced non-existent methods.

  describe('PATCH update-bus/:id', () => {
    it('should update a bus', async () => {
      const updateDto = { name: 'حافلة محدثة' };
      const result = { success: true, message: 'تم تحديث الحافلة بنجاح', data: { id: '1', ...updateDto } };
      mockBusesService.update.mockResolvedValue(result);

      const response = await controller.update('1', updateDto);
      expect(mockBusesService.update).toHaveBeenCalledWith('1', updateDto);
      expect(response).toEqual(result);
    });
  });

  describe('DELETE delete-bus/:id', () => {
    it('should delete a bus', async () => {
      const result = { success: true, message: 'تم حذف الحافلة بنجاح' };
      mockBusesService.remove.mockResolvedValue(result);

      const response = await controller.remove('1');
      expect(mockBusesService.remove).toHaveBeenCalledWith('1');
      expect(response).toEqual(result);
    });
  });
});
