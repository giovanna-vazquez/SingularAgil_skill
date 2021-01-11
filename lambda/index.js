/* *
 * This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
 * Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
 * session persistence, api calls, and more.
 * */
 
 /*CONSTANTS*/
const Alexa = require('ask-sdk-core');
const host = 'http://34.121.76.223:80';

const initTextoLista = 'Selecciona el nombre del contenido que quieres aprender.';
const lstContenidos = ' Uno, definición de agilidad. ' +
    'Dos, Porque usar agilidad. ' +
    'Tres, Complejidad de los proyectos. ' +
    'Cuatro, Agilidad y el entorno VUCA. ' +
    'Cinco, Marcos de trabajo ágiles. ' +
    'Seis, Manifiesto ágil. ' +
    'Siete, Valores ágiles. ' +
    'Ocho, Principios ágiles. ' +
    'Nueve, Diferencia entre proyectos en cascada y ágiles. ' +
    'Diez, Mindset ágil. ';



const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Claro... ¿me puedes proporcionar tu número de matrícula para continuar aprendiendo?';
        const repromptOutput = 'Hmm, Recuerda que puedes encontrar tu número de matrícula en tu correo electrónico. Si ya lo tienes ¿me puedes proporcionar tu número de mátricula?';
        
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        sessionAttributes.intentsCount= 0;
        sessionAttributes.maxIntents= 1;
        
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptOutput)
            .getResponse();
    }
};

const UnknownIntentHandler = {
    canHandle(handlerInput) {
         return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'UnknownNumberIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Puedes encontrar tu número de matrícula en tu correo electrónico. Si ya lo tienes ¿me puedes proporcional tu número de mátricula?';
        
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        sessionAttributes.intentsCount= 0;
        sessionAttributes.maxIntents= 1;
        
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const StudentNumberIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'StudentNumberIntent';
    },
    async handle(handlerInput) {
        const numeroUsuarioRequest = handlerInput.requestEnvelope.request.intent.slots.number.value;
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
       
        var mensajeResponse = 'mensaje por defecto';
        var mensajeReprompt = ''
        var token = '';
        //TODO: Consultar en base de datos el usuario 
        //Request numero de usuario
        //Response Datos de usuario y ultimo Contenido revisado
        var userExists = false;
        var lastContent = ''; //Variable de sesion 
        var nombreUsuario = '';
        
        await getToken(host + '/login') 
        .then((response) => {
            token = response;
            sessionAttributes.token = token;
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
        })
        .catch((err) => {
            mensajeResponse = err.message;
         //mensajeResponse = '¡Oh!, algo salió mal, intentalo nuevamente.';
        });
       
        await getStudentData(host + '/studentByEnrollment/' + numeroUsuarioRequest , token)
        .then((response) => {
            const data = JSON.parse(response);
            var persona = {
                id: data.id,
                matricula: data.matricula,
                nombre: data.nombre,
                apellido: data.apellido,
                email: data.email,
                telefono: data.telefono,
                ultimo_curso: data.ultimo_curso
            };
            sessionAttributes.persona = persona;
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
            nombreUsuario = data.nombre;
            lastContent = data.ultimo_curso;
            userExists = data.id =! null ? true : false;
        })
        .catch((err) => {
             //mensajeResponse = 'error: ' + err.message;
            // mensajeResponse = '¡Oh!, algo salió mal, intentalo nuevamente.';
        });
     
      
        //Si el usuario existe
        //Consulta ultimo contenido
        if(userExists)
        {
            if(lastContent !==null){
                    
                var titleContent = getTitle(lastContent);
                // mensajeResponse = '¿Quieres continuar el curso '+ lastContent +'?';
                mensajeResponse = 'Hola nuevamente ' + nombreUsuario + '. Tu último tema fue '+ titleContent +'. ';
                mensajeReprompt = "Hmm, no escuche tu respuesta ¿Quieres continuar con otro tema?";
                
                // SET variable sesion flujo=continuar
                sessionAttributes.flujo = 'continuar';
                sessionAttributes.lastLesson = lastContent;
                handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
                    
                return handlerInput.responseBuilder
                .speak(mensajeResponse)
                .addDelegateDirective({
                    name: 'FlowIntent',
                    confirmationStatus: 'NONE',
                    slots: {}})
                .getResponse();
            }
            else{
                mensajeResponse = 'Te damos la bienvenida al curso de Agilidad. ' + nombreUsuario + ', los temas que podemos aprender son: ' + lstContenidos;
                mensajeReprompt = 'Hmm, no escuche tu respuesta, si quieres puedo repetir la lista de temas o si prefieres puedes revisar en tu correo electrónico la lista de temas que podemos estudiar ¿Quieres que repita los temas?';
            }
        }
        else if (sessionAttributes.intentsCount < sessionAttributes.maxIntents)
        {
            mensajeResponse = 'Hmm, no encuentro tu número en el registro. ¿Puedes repetirlo?';
            sessionAttributes.intentsCount = sessionAttributes.intentsCount + 1;
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
        }
        else
        {
            mensajeResponse = '¡Oh!, algo salió mal, no encuentro tu información. Valida tu información e intentalo nuevamente.';
        }
        
        return handlerInput.responseBuilder
            .speak(mensajeResponse)
            .reprompt(mensajeReprompt)
            .getResponse();
    }
};

const LessonIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'LessonIntent';
    },
    async handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        
        const numleccionRequest = handlerInput.requestEnvelope.request.intent.slots.lesson.value;
        var idleccionRequest = '';
        
        try{
            idleccionRequest = handlerInput.requestEnvelope.request.intent.slots.lesson.resolutions.resolutionsPerAuthority[0].values[0].value.id;
        }
        catch(error){
            /*Cuando el intent fue delegado y no es posible acceder a este dato.*/
            //idleccionRequest =  numleccionRequest;
        }
        
        if(idleccionRequest !== '' || (idleccionRequest === '' && sessionAttributes.flujo === 'continuar')){
            const speakOutput = 'Contenido: ' + numleccionRequest + ' ID: ' + idleccionRequest + '. Descripción de contenido aquí. ';
       
            //TODO: funcion para leer contenido del curso seleccionado
            const repromptOutput = '¿Quieres aprender otro contenido?';
        
            if(sessionAttributes.flujo === 'continuar'){
           
                sessionAttributes.flujo = 'otroContenido';
                handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
        
                return handlerInput.responseBuilder
                .speak(speakOutput + '. Para continuar con otro contenido, selecciona, ' + lstContenidos)
                .reprompt('¡Adios!')
                .getResponse();
            }
            else{
                //SET variable sesion flujo=otroContenido
                sessionAttributes.flujo = 'otroContenido';
                
                sessionAttributes.persona['ultimo_curso'] = idleccionRequest;
                handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
                var persona = sessionAttributes.persona;
                
                await saveStudentData(host + '/student/' + sessionAttributes.persona['id'] ,sessionAttributes.token, persona)
                    .then((response) => {
                    })
                    .catch((err) => {
                    });
        
        
                return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(repromptOutput)
                .addDelegateDirective({
                    name: 'FlowIntent',
                    confirmationStatus: 'NONE',
                    slots: {}
                })
                .getResponse();
            }
        }
        else{
            return handlerInput.responseBuilder
                .speak('No encontre ese curso. Selecciona, ' + lstContenidos)
                //.reprompt('No encontre ese curso. Selecciona, ' + lstContenidos)
                .getResponse();
        }
    }
    
};


const YesIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
         && Alexa.getIntentName(handlerInput.requestEnvelope) === 'FlowIntent'
             && (handlerInput.requestEnvelope.request.intent.slots.continue.value === 'si'
             || handlerInput.requestEnvelope.request.intent.slots.continue.value === 'sí'
             || handlerInput.requestEnvelope.request.intent.slots.continue.resolutions.resolutionsPerAuthority[0].values[0].value.id==="1");
    },
    handle(handlerInput) {
        // LEER VARIABLE flujo
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
         
        //SI ES CONTINUAR 
        if (sessionAttributes.flujo === 'continuar'){
            return handlerInput.responseBuilder
            .addDelegateDirective({
                name: 'LessonIntent',
                confirmationStatus: 'NONE',
                slots: {
                   lesson: {
                        name: 'lesson',
                        value: sessionAttributes.lastLesson
                    }
                }
            })
            .getResponse();
         }
         else if(sessionAttributes.flujo === 'otroContenido'){
            //SI ES otroContenido
            const speakOutput = initTextoLista + lstContenidos;
        
            return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
         }
        
    }
};

const NoIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
         && Alexa.getIntentName(handlerInput.requestEnvelope) === 'FlowIntent'
             && (handlerInput.requestEnvelope.request.intent.slots.continue.value === 'no'
             || handlerInput.requestEnvelope.request.intent.slots.continue.resolutions.resolutionsPerAuthority[0].values[0].value.id==="2");
    },
    handle(handlerInput) {
        
        //LEER VARIABLE flujo
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        
        //SI ES continuar 
        if (sessionAttributes.flujo === 'continuar'){
            sessionAttributes.flujo = 'otroContenido';
              
            const speakOutput = initTextoLista + lstContenidos;
        
            return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
        }
        else if(sessionAttributes.flujo === 'otroContenido'){
            //SI ES otroContenido
            const speakOutput = '¡Adiós!';
        
            return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
        }
    }
};

const RepiteIntentHandler = {
    canHandle(handlerInput) {
         return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RepiteIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Los temas son: ' + lstContenidos + ' . ¿Con cuál tema quieres iniciar?';
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Proporciona tu número de alumno. Al ingresar selecciona uno de nuestros cursos.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = '¡adiós!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        //const speakOutput = 'Lo siento, no entiendo. Inténtalo de nuevo.';
        const speakOutput = 'Hmm, no entendí tu respuesta, Estos son los temas que podemos estudiar. '+ lstContenidos + ' ¿Con cuál tema quieres iniciar?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        //const speakOutput = 'Hmm, no entendí tu respuesta. Estos son los temas que podemos estudiar. '+ lstContenidos +' ¿Con cuál tema quieres iniciar?';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);
        const speakOutput = error.message;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

/*INTERCEPTORS*/
const DialogManagementStateInterceptor = {
  process(handlerInput) {
    const currentIntent = handlerInput.requestEnvelope.request.intent;

    if (handlerInput.requestEnvelope.request.type === "IntentRequest"
      && handlerInput.requestEnvelope.request.dialogState !== "COMPLETED") {

      const attributesManager = handlerInput.attributesManager;
      const sessionAttributes = attributesManager.getSessionAttributes();

      // If there are no session attributes we've never entered dialog management
      // for this intent before.
      if (sessionAttributes[currentIntent.name]) {
        let savedSlots = sessionAttributes[currentIntent.name].slots;
        for (let key in savedSlots) {

          // we let the current intent's values override the session attributes
          // that way the user can override previously given values.
          // this includes anything we have previously stored in their profile.
          if (!currentIntent.slots[key].value && savedSlots[key].value) {
            currentIntent.slots[key] = savedSlots[key];
          }
        }    
      }

      sessionAttributes[currentIntent.name] = currentIntent;
      attributesManager.setSessionAttributes(sessionAttributes);
    }
  }
};

const getToken = (url) => new Promise((resolve, reject) => {
      
    const client = url.startsWith('https') ? require('https') : require('http');
    const postData = JSON.stringify({
        'username': 'alexa', 'password': 'password'
    });

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        } 
    }
 
    const req = client.request(url,options, (res) => {
        var token = '';
        token = res.headers['authorization'];
        resolve(token);
        });
    req.on('error', (err) => reject(err));

    req.write(postData);
    req.end();
  
});


const getStudentData = (url,token) => new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? require('https') : require('http');
    const options = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        }
    };
    const request = client.get(url,options, (response) => {
        if (response.statusCode < 200 || response.statusCode > 299) {
            reject(new Error(`Failed with status code: ${response.statusCode}`));
        }
        const body = [];
        response.on('data', (chunk) => body.push(chunk));
        response.on('end', () => resolve(body.join('')));
    });
    request.on('error', (err) => reject(err));
  
});

const saveStudentData = (url,token,persona) => new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? require('https') : require('http');
    
    const putData = JSON.stringify(
        {
            "id": persona.id,
            "matricula": persona.matricula,
            "nombre": persona.nombre,
            "apellido": persona.apellido,
            "email": persona.email,
            "telefono": persona.telefono,
            "ultimo_curso": persona.ultimo_curso
        }
    );

    const options = {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
            'Content-Length': Buffer.byteLength(putData)
        } 
    }
 
    const req = client.request(url,options, (res) => {
         if (res.statusCode < 200 || res.statusCode > 299) {
            reject(new Error(`Failed with status code: ${res.statusCode}`));
        }
        if(res.statusCode === 200){
            resolve('ok');
            
        }
    });
    req.on('error', (err) => reject(err));

    req.write(putData);
    req.end();
});

/*METHODS*/
function getTitle(idContent){
    var title = '';
    
    switch(idContent){
        case '1': title = 'definición de agilidad'; break;
        case '2': title = 'Porque usar agilidad'; break;
        case '3': title = 'Complejidad de los proyectos'; break;
        case '4': title = 'Agilidad y el entorno VUCA'; break;
        case '5': title = 'Marcos de trabajo ágiles'; break;
        case '6': title = 'Manifiesto ágil'; break;
        case '7': title = 'Valores ágiles'; break;
        case '8': title = 'Principios Ágiles'; break;
        case '9': title = 'Diferencia entre proyectos en cascada y ágiles'; break;
        case '10': title = 'Mindset ágil'; break;
        default: title = 'Título no encontrado'; break;
    }
    return title;
}
/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        UnknownIntentHandler,
        StudentNumberIntentHandler,
        LessonIntentHandler,
        YesIntentHandler,
        NoIntentHandler,
        RepiteIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(ErrorHandler)
    //.addRequestInterceptors(DialogManagementStateInterceptor)
    .withCustomUserAgent('sample/hello-world/v1.2')
    .lambda();