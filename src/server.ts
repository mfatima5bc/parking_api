import express, { NextFunction, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import swaggerFile from "./swagger.json";

import { router } from "./routes";
import { client } from "../database/db";
import { AppError } from "./http/middlwares/AppError";
client;

const app = express();

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));

app.use(express.json());

app.use(router);

app.use((error: Error, request: Request, response: Response, next: NextFunction) => {
    if (error instanceof AppError) {
        return response.status(error.statusCode).json({
            message: error.message
        });
    }

    return response.status(500).json({
        status: "Error",
        message: `Internal server error - ${error.message}`
    });

    next();
});

app.listen(3333, ()=> {
    console.log("🚀 Server runing!");
});