import { Injectable, NotFoundException } from '@nestjs/common';
import { STATES } from './cities.data';
import { CityEntity, CityStateGroup } from './cities.entity';

@Injectable()
export class CitiesService {
  private readonly states = STATES;

  getAllStates(): CityStateGroup[] {
    return this.states.map((s) => ({ state: s.state, cities: [...s.cities] }));
  }

  getStates(): string[] {
    return this.states.map((s) => s.state);
  }

  getStatesWithCities(): CityStateGroup[] {
    return this.getAllStates();
  }

  getAllCities(): string[] {
    return this.states.flatMap((s) => s.cities);
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
    return this.states.flatMap((s) =>
      s.cities
        .filter((name) => name.includes(q) || s.state.includes(q))
        .map((name) => ({ state: s.state, name })),
    );
  }
}
