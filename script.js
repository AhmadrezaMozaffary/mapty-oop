'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  date = new Date();
  id = crypto.randomUUID().slice(-10); // Create random ID

  constructor(coords, duration, distance) {
    this.coords = coords; // [lat, lng]
    this.duration = duration; // in min
    this.distance = distance; // in KM
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = ` ${this.type[0].toUpperCase()}${this.type.slice(
      1
    )} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, duration, distance, cadance) {
    super(coords, duration, distance);
    this.cadance = cadance;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance; // Min per KM
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, duration, distance, elevation) {
    super(coords, duration, distance);
    this.elevation = elevation;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60); // KM per Hour
    return this.speed;
  }
}

//////////////////////////////////////
// Application architecture
//////////////////////////////////////
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    // Get users position
    this._getPosition();

    // Load data from local storage
    this._getLocalStorage();

    // Handling Events
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToMarker.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alertify.error('Could not get your position');
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
  }

  _loadMap(position) {
    alertify.success("Loading map ...")
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        ' Ahmadreza Mozaffary on  <a href="https://github.com/AhmadrezaMozaffary">GITHUB</a> ',
    }).addTo(this.#map);

    L.marker(coords).addTo(this.#map).bindPopup('You are here now').openPopup();

    // Handling Click on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(workout => {
      this._renderWorkoutMarker(workout);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Clear form
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const inputsAreNumber = (...inputs) =>
      inputs.every(input => Number.isFinite(input));

    const inputsArePos = (...inputs) => inputs.every(input => input > 0);

    e.preventDefault();

    // Get values from the form inputs
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout is Running => Create Running obj
    if (type == 'running') {
      const cadence = +inputCadence.value;
      // Validating the datas
      if (
        !inputsAreNumber(distance, duration, cadence) ||
        !inputsArePos(distance, duration, cadence)
      )
        return alertify.error('Inputs have to be positive numbers');
      workout = new Running([lat, lng], duration, distance, cadence);
    }

    // If workout is Cycling => Create Cycling obj
    if (type == 'cycling') {
      const elevation = +inputElevation.value;
      // Validating the datas
      if (
        !inputsAreNumber(distance, duration, elevation) ||
        !inputsArePos(distance, duration)
      )
        return alertify.error('Inputs have to be positive numbers');
      workout = new Cycling([lat, lng], duration, distance, elevation);
    }

    // Add new obj to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render Workout on list ( 'sidebar' )
    this._renderWorkout(workout);

    //Hide and clear form
    this._hideForm();

    // Store data to the local storage
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    // Display Marker after submition
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 50,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description} `
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let workoutComponent = `
          <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <h2 class="workout__title">${workout.description}</h2>
            <div class="workout__details">
              <span class="workout__icon">${
                workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
              }</span>
              <span class="workout__value">${workout.distance}</span>
              <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">⏱</span>
              <span class="workout__value">${workout.duration}</span>
              <span class="workout__unit">min</span>
            </div>
      `;

    if (workout.type === 'running') {
      workoutComponent += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadance}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
        `;
    }
    if (workout.type === 'cycling') {
      workoutComponent += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevation}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
        `;
    }

    form.insertAdjacentHTML('afterend', workoutComponent);
  }

  _moveToMarker(event) {
    const eTarget = event.target.closest('.workout');

    if (!eTarget) return;

    const workout = this.#workouts.find(
      workout => workout.id == eTarget.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach(workout => {
      this._renderWorkout(workout);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
