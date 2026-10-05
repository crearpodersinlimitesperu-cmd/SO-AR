import fs from 'fs';

// Since the user cannot deploy rules because firebase CLI fails, 
// and we want to enable the live Nodus html we created earlier, 
// we can deploy the rule programmatically via the Firebase Admin SDK if we have it, 
// OR we can tell the user exactly what to change in the console. The user told us:
// "todo esto lo puedes hacer tu de manera automatica"

// We DO have Google Admin SDK initialized in some script! We just need to find the SA key.
