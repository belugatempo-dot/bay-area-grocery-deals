import type { CityGroup } from '../types';

export const cityGroups: CityGroup[] = [
  {
    region: 'south_bay',
    regionName: 'South Bay',
    regionNameZh: '南湾',
    cities: [
      { id: 'san_jose', name: 'San Jose', nameZh: '圣何塞', lat: 37.3382, lng: -121.8863 },
      { id: 'sunnyvale', name: 'Sunnyvale', nameZh: '森尼韦尔', lat: 37.3688, lng: -122.0363 },
      { id: 'santa_clara', name: 'Santa Clara', nameZh: '圣克拉拉', lat: 37.3541, lng: -121.9552 },
      { id: 'cupertino', name: 'Cupertino', nameZh: '库比蒂诺', lat: 37.3230, lng: -122.0322 },
      { id: 'milpitas', name: 'Milpitas', nameZh: '苗必达', lat: 37.4323, lng: -121.8996 },
      { id: 'mountain_view', name: 'Mountain View', nameZh: '山景城', lat: 37.3861, lng: -122.0839 },
    ],
  },
  {
    region: 'peninsula',
    regionName: 'Peninsula',
    regionNameZh: '半岛',
    cities: [
      { id: 'palo_alto', name: 'Palo Alto', nameZh: '帕罗奥图', lat: 37.4419, lng: -122.1430 },
      { id: 'redwood_city', name: 'Redwood City', nameZh: '红木城', lat: 37.4852, lng: -122.2364 },
      { id: 'san_mateo', name: 'San Mateo', nameZh: '圣马特奥', lat: 37.5630, lng: -122.3255 },
      { id: 'daly_city', name: 'Daly City', nameZh: '戴利城', lat: 37.6879, lng: -122.4702 },
    ],
  },
  {
    region: 'sf',
    regionName: 'San Francisco',
    regionNameZh: '旧金山',
    cities: [
      { id: 'san_francisco', name: 'San Francisco', nameZh: '旧金山', lat: 37.7749, lng: -122.4194 },
    ],
  },
  {
    region: 'east_bay',
    regionName: 'East Bay',
    regionNameZh: '东湾',
    cities: [
      { id: 'fremont', name: 'Fremont', nameZh: '弗里蒙特', lat: 37.5485, lng: -121.9886 },
      { id: 'union_city', name: 'Union City', nameZh: '联合城', lat: 37.5934, lng: -122.0438 },
      { id: 'hayward', name: 'Hayward', nameZh: '海沃德', lat: 37.6688, lng: -122.0808 },
      { id: 'oakland', name: 'Oakland', nameZh: '奥克兰', lat: 37.8044, lng: -122.2712 },
      { id: 'berkeley', name: 'Berkeley', nameZh: '伯克利', lat: 37.8716, lng: -122.2727 },
      { id: 'richmond', name: 'Richmond', nameZh: '里士满', lat: 37.9358, lng: -122.3478 },
    ],
  },
];

export const allCities = cityGroups.flatMap((g) => g.cities);
