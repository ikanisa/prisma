/* eslint-env node */
import app from './server';

const port = process.env.PORT ?? 3000;
app.listen(port, () => {
  console.log(`Agent service listening on port ${port}`);
});
