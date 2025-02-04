import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import { client } from "../../database/db";
import { Parkin } from "../models/Parking";
import { VacanciesServices } from "./VacanciesService";
import { CarsServices } from "./CarsServices";

dayjs.extend(utc);

const VALORPERHOUR = 20; // Value per 1h on parking
const OPENINGTIME = 6; // Opening time
const CLOSETIME = 18; // Closing time
const ALLVACANCIES = 20; // Total parking vacancies
const MINIMUMHOURS = 1; //Minimum number of hours

class ParkingService {
    async create(car_id: string, vacancy_id: string): Promise<void> {
        const currentDate = this.getCurrentDate();
        const hour = this.getHour(currentDate);

        if (hour < OPENINGTIME || hour > CLOSETIME) {
            throw new Error("Hours outside opening hours");
        }

        const vacancyService = new VacanciesServices();
        const carsService = new CarsServices();

        const allAvailableVacancies = await vacancyService.verifyAllAvailableVacancies();

        if (allAvailableVacancies == ALLVACANCIES) {
            throw new Error("There are no vacancies available!")
        }

        const carID = await carsService.findByID(car_id);
        const vacancyID = await vacancyService.findByID(vacancy_id);

        if (!carID || !vacancyID) {
            throw new Error("Not exist this Car ID or not exist this Vacancy ID!");
        }

        const carIdParking = await this.verifyCarIdParking(car_id);

        if (carIdParking) {
            throw new Error("That car already parked!");
        }

        const vacancyAvailable = await vacancyService.verifyAvaliableVacancy(vacancy_id);

        if (!vacancyAvailable) {
            throw new Error("This vacancy doesn't available!")
        }

        const parking = new Parkin();

        parking.entry_time = this.getCurrentDate();
        parking.value = 0;
        parking.car_id = car_id;
        parking.vacancy_id = vacancy_id;

        const query = "INSERT INTO parking (id, entry_time, value, car_id, vacancy_id) VALUES ($1, $2, $3, $4, $5)";
        const values = [parking.id, parking.entry_time, parking.value, parking.car_id, parking.vacancy_id];

        await client
            .query(query, values)
            .then(() => console.log("Parking was created!"))
            .catch((error) => console.error(error));

        await vacancyService.updateAvailableVacancy(vacancy_id, false);
    }

    async unparking(vacancy_id: string) {
        const currentDate = this.getCurrentDate();
        const currentHour = this.getHour(currentDate);

        if (currentHour < OPENINGTIME || currentHour > CLOSETIME) {
            throw new Error("Hours outside opening hours");
        }

        const vacancyService = new VacanciesServices();

        const vacancy = await vacancyService.findByID(vacancy_id);

        if (!vacancy) {
            throw new Error("This Vacancy ID doesn't exist!");
        }

        const parking = await this.verifyVacancyIdParking(vacancy_id);

        if (!parking) {
            throw new Error("There is no car parked in the vacancy!");
        }

        const entryTime = await this.getEntryTimeParking(parking.id);
        let hour = this.compareInHours(entryTime, currentDate);

        if (hour < MINIMUMHOURS) {
            hour = MINIMUMHOURS;
        }

        const value = hour * VALORPERHOUR;

        await this.updateValueAndExitTimeParking(parking.id, value, currentDate);
        await vacancyService.updateAvailableVacancy(vacancy_id, true);
    }

    async verifyVacancyIdParking(vacancy_id: string) {
        const vacancy = "SELECT id FROM parking WHERE vacancy_id = $1 AND value = 0";

        const parking = await client.query(vacancy, [vacancy_id]);
        return parking.rows[0];
    }

    async verifyCarIdParking(car_id: string) {
        const car = "SELECT id FROM parking WHERE car_id = $1 AND value = 0";

        const parking = await client.query(car, [car_id]);
        return parking.rows[0];
    }

    async getEntryTimeParking(parking_id: string) {
        const query = "SELECT entry_time FROM parking WHERE id = $1";

        const parking = await client.query(query, [parking_id]);
        return parking.rows[0].entry_time;
    }

    async updateValueAndExitTimeParking(parking_id: string, value: number, exit_time: Date) {
        const query = "UPDATE parking SET value = $1, exit_time = $2 WHERE id = $3";
        const values = [value, exit_time, parking_id];

        await client
            .query(query, values)
            .then(() => console.log("Parking was updated!"))
            .catch((error) => console.error(error));
    }

    getCurrentDate(): Date {
        return dayjs().toDate();
    }

    getHour(timestamp: Date): number {
        return dayjs(timestamp).get("hour");
    }

    convertToUTC(date: Date): string {
        return dayjs(date).utc().local().format();
    }

    compareInHours(star_date: Date, end_date: Date): number {
        const start_date_utc = this.convertToUTC(star_date);
        const end_date_utc = this.convertToUTC(end_date);

        return dayjs(end_date_utc).diff(start_date_utc, "hours");
    }
}

export { ParkingService };