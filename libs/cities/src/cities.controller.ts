import { Controller, Get, Param, Query } from '@nestjs/common';
import { CitiesService } from './cities.service';
import { SearchCitiesDto } from './cities.dto';

@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Get()
  getAllCities() {
    return this.citiesService.getAllCities();
  }

  @Get('states')
  getStates() {
    return this.citiesService.getStates();
  }

  @Get('states-with-cities')
  getStatesWithCities() {
    return this.citiesService.getStatesWithCities();
  }

  @Get('all')
  getAll() {
    return this.citiesService.getAllStates();
  }

  @Get('search')
  search(@Query() query: SearchCitiesDto) {
    return this.citiesService.search(query.q ?? '');
  }

  @Get('state/:state')
  getCitiesByState(@Param('state') state: string) {
    return this.citiesService.getCitiesByState(state);
  }
}
