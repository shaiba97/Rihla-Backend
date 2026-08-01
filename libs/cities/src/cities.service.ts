import { Injectable, NotFoundException } from '@nestjs/common';
import { STATES } from './cities.data';
import { CityEntity, CityStateGroup } from './cities.entity';

@Injectable()
export class CitiesService {
  private readonly states = STATES;

  getAllStates(): CityStateGroup[] {
    return this.states.map((s) => ({ state: s.state, cities: [...s.cities] }));
  }

  getAllCities(): CityEntity[] {
    return this.states.flatMap((s) =>
      s.cities.map((name) => ({ state: s.state, name })),
    );
  }

  getCitiesByState(state: string): string[] {
    const match = this.states.find(
      (s) => s.state === state || s.state.includes(state),
    );
    if (!match) throw new NotFoundException('الولاية غير موجودة');
    return [...match.cities];
  }

  search(query: string): CityEntity[] {
    const q = query.trim();
    if (!q) return [];
    return this.getAllCities().filter(
      (c) => c.name.includes(q) || c.state.includes(q),
    );
  }
}
