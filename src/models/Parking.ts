import { v4 as uuidV4 } from "uuid";

class Parkin {
    id: string;
    entry_time: Date;
    exit_time: Date;
    value: number;
    car_id: string;
    vacancy_id: string;

    constructor() {
        if (!this.id) {
            this.id = uuidV4();
        }
    }
}

export { Parkin };