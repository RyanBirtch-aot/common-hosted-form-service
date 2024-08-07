import { Components } from 'formiojs';
const FieldComponent = (Components as any).components.field;
import MapService from './services/MapService';
import baseEditForm from './Component.form';
import * as L from 'leaflet';

const DEFAULT_CENTER: [number, number] = [
  53.96717190097409, -123.98320425388914,
]; // Ensure CENTER is a tuple with exactly two elements

export default class Component extends (FieldComponent as any) {
  static schema(...extend) {
    return FieldComponent.schema({
      type: 'map',
      label: 'Map',
      key: 'map',
      input: true,
      defaultvalue: { features: [] },
      ...extend,
    });
  }

  static get builderInfo() {
    return {
      title: 'Map',
      group: 'basic',
      icon: 'map',
      weight: 70,
      schema: Component.schema(),
    };
  }

  static editForm = baseEditForm;

  componentID: string;
  mapService: MapService;

  constructor(component, options, data) {
    super(component, options, data);
    this.componentID = super.elementInfo().component.id;
  }

  render() {
    return super.render(
      `<div id="map-${this.componentID}" style="height:400px; z-index:1;"></div>`
    );
  }

  attach(element) {
    const superAttach = super.attach(element);
    this.loadMap();
    return superAttach;
  }

  loadMap() {
    const mapContainer = document.getElementById(`map-${this.componentID}`);
    const form = document.getElementsByClassName('formio');
    let drawOptions = {
      marker: false,
      circlemarker: false,
      polygon: false,
      polyline: false,
      circle: false,
      rectangle: null,
    };

    // Set drawing options based on markerType
    if (this.component.markerType === 'rectangle') {
      drawOptions.rectangle = { showArea: false }; // fixes a bug in Leaflet.Draw
    } else {
      drawOptions.rectangle = false;
      drawOptions[this.component.markerType] = true; // set marker type from user choice
    }

    const { numPoints, defaultZoom, readOnlyMap, center, defaultValue } =
      this.component;

    const { readOnly: viewMode } = this.options;

    let initialCenter;
    if (center && center.features && center.features[0]) {
      initialCenter = center.features[0].coordinates;
    } else {
      initialCenter = DEFAULT_CENTER;
    }

    this.mapService = new MapService({
      mapContainer,
      drawOptions,
      center: initialCenter,
      form,
      numPoints,
      defaultZoom,
      readOnlyMap,
      defaultValue,
      onDrawnItemsChange: this.saveDrawnItems.bind(this),
      viewMode,
    });

    // Load existing data if available
    if (this.dataValue && this.dataValue.features) {
      try {
        this.mapService.loadDrawnItems(this.dataValue.features);
      } catch (error) {
        console.error('Failed to parse dataValue:', error);
      }
    }
  }

  saveDrawnItems(drawnItems: L.Layer[]) {
    const features = drawnItems.map((layer: any) => {
      if (layer instanceof L.Marker) {
        return {
          type: 'marker',
          coordinates: layer.getLatLng(),
        };
      } else if (layer instanceof L.Rectangle) {
        return {
          type: 'rectangle',
          bounds: layer.getBounds(),
        };
      } else if (layer instanceof L.Circle) {
        return {
          type: 'circle',
          coordinates: layer.getLatLng(),
          radius: layer.getRadius(),
        };
      } else if (layer instanceof L.Polygon) {
        return {
          type: 'polygon',
          coordinates: layer.getLatLngs(),
        };
      } else if (layer instanceof L.Polyline) {
        return {
          type: 'polyline',
          coordinates: layer.getLatLngs(),
        };
      }
    });

    this.setValue({ features });
  }

  setValue(value) {
    super.setValue(value);

    // Additional logic to render the saved data on the map if necessary
    if (this.mapService && value && value.features) {
      try {
        //const parsedValue = JSON.parse(value);

        this.mapService.loadDrawnItems(value.features);
      } catch (error) {
        console.error('Failed to parse value:', error);
      }
    }
  }

  getValue() {
    return this.dataValue;
  }
}