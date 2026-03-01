import { app, logger } from './app.js';

const port = process.env.PORT || 3000;

app.listen(port, () => {
    logger.info(`Server running on port ${port}`);
});
