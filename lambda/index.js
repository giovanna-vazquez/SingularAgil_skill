/* *
 * This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
 * Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
 * session persistence, api calls, and more.
 * */

/*CONSTANTS*/
const Alexa = require('ask-sdk-core');
const host = 'http://104.43.216.120:80';

const initTextoLista = 'Los 11 temas que podemos aprender son. ';
const endTextoListaPrimeraParte = ' ¿Quieres conocer el resto de los temas?';
const endTextoListaSegundaParte = ' ¿Con cuál tema quieres iniciar?';
var lstContenidosRestantes = '';
var lstPrimeraMitadContenidos = '';
var lstSegundaMitadContenidos = '';
var lstDescripcion = '';


const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Claro... ¿me puedes proporcionar tu número de matrícula para continuar aprendiendo?';
        const repromptOutput = 'Hmm, Recuerda que puedes encontrar tu número de matrícula en tu correo electrónico. Si ya lo tienes ¿me puedes proporcionar tu número de mátricula?';

        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        sessionAttributes.intentsCount = 0;
        sessionAttributes.maxIntents = 1;
        sessionAttributes.temas = null;
        sessionAttributes.persona = null;

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
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        if (sessionAttributes.persona === null) {

            const speakOutput = 'Puedes encontrar tu número de matrícula en tu correo electrónico. Si ya lo tienes ¿me puedes proporcionar tu número de matrícula?';

            const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

            sessionAttributes.intentsCount = 0;
            sessionAttributes.maxIntents = 1;

            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakOutput)
                .getResponse();
        }
        else {
            return handlerInput.responseBuilder
                //.speak(mensajeResponse)
                .addDelegateDirective({
                    name: 'AMAZON.FallbackIntent',
                    confirmationStatus: 'NONE',
                    slots: {}
                })
                .getResponse();
        }
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

        var mensajeResponse = '';
        var mensajeReprompt = ''
        var token = '';
        //Response Datos de usuario y ultimo Contenido revisado
        var userExists = false;
        var lastContent = ''; //Variable de sesion 
        var nombreUsuario = '';
        var nTemas = 0;

        await getToken(host + '/login')
            .then((response) => {
                token = response;
                sessionAttributes.token = token;
                handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
            })
            .catch((err) => {
                mensajeResponse = '¡Oh!, algo salió mal, intentalo nuevamente.';
            });

        await getStudentData(host + '/studentByEnrollment/' + numeroUsuarioRequest, token)
            .then((response) => {
                const data = JSON.parse(response);
                var persona = {
                    id: data.id,
                    matricula: data.matricula,
                    nombre: data.nombre,
                    apellido: data.apellido,
                    email: data.email,
                    telefono: data.telefono,
                    id_ultimo_tema: data.id_ultimotema,
                    titulo_ultimo_tema: data.titulo_ultimotema
                };
                sessionAttributes.persona = persona;
                handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
                nombreUsuario = data.nombre;
                lastContent = data.id_ultimotema;
                userExists = data.id = ! null ? true : false;
            })
            .catch((err) => {
                mensajeResponse = '¡Oh!, algo salió mal, intentalo nuevamente.';
            });


        //Si el usuario existe
        //Consulta ultimo contenido
        if (userExists) {
            //Obtener temas segun su avance de estudio
            await getStudentTopics(host + '/remainingTopics/' + sessionAttributes.persona.id, token)
                .then((response) => {
                    lstContenidosRestantes = '';
                    const data = JSON.parse(response);
                    nTemas = Object.keys(data).length;
                    data.forEach(function (item) {
                        lstContenidosRestantes += `${item.id}, ${item.titulo}. `;
                    });

                })
                .catch((err) => {
                    mensajeResponse = 'error: ' + err.message;
                });

            if (nTemas < 10 && nTemas > 0) {
                var nfinalizados = 10 - nTemas;
                var nrestantes = nTemas;
                if (nTemas > 1) {
                    mensajeResponse = 'Hola nuevamente ' + nombreUsuario + ', ya finalizaste ' + nfinalizados + ' temas. Los ' + nrestantes + ' que te faltan son, ' + lstContenidosRestantes + ' ¿Con cuál tema quieres continuar?';
                }
                else {
                    mensajeResponse = 'Hola nuevamente ' + nombreUsuario + ', ya finalizaste ' + nfinalizados + ' temas. El tema que te falta es, ' + lstContenidosRestantes;
                    //TODO: continuar lleva al tema que le falta
                    sessionAttributes.flujo = 'continuar';
                    var idxId = lstContenidosRestantes.indexOf(",") + 1;
                    var idNextTopic = lstContenidosRestantes.substring(0, idxId);
                    sessionAttributes.lastLesson = idNextTopic;
                    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

                    return handlerInput.responseBuilder
                        .speak(mensajeResponse)
                        .addDelegateDirective({
                            name: 'FlowIntent',
                            confirmationStatus: 'NONE',
                            slots: {}
                        })
                        .getResponse();
                }

                mensajeReprompt = "Hmm, no escuche tu respuesta ¿Quieres continuar con otro tema?";

            }
            else if (nTemas === 0) {
                mensajeResponse = 'Hola nuevamente ' + nombreUsuario + ', ¡ya completaste todos los temas del curso! ¿Quieres que te diga los primeros 5 temas para repasar alguno?';
                mensajeReprompt = "Hmm, no escuche tu respuesta ¿Quieres continuar con otro tema?";
                sessionAttributes.flujo = 'otroContenido';
                handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
            }
            else {
                if (lastContent !== null) {

                    mensajeResponse = 'Hola nuevamente ' + nombreUsuario + '. Tu último tema fue ' + sessionAttributes.persona.titulo_ultimo_tema + '. ';
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
                            slots: {}
                        })
                        .getResponse();
                }
                else {
                    var topicssessionAttributes = await getContents(handlerInput);
                    handlerInput.attributesManager.setSessionAttributes(topicssessionAttributes);

                    mensajeResponse = 'Hola ' + nombreUsuario + ', te damos la bienvenida al curso de Agilidad. ' + initTextoLista + ' ' + sessionAttributes.temas.primera_parte + endTextoListaPrimeraParte;
                    mensajeReprompt = 'Hmm, no escuche tu respuesta, si quieres puedo repetir la lista de temas o si prefieres puedes revisar en tu correo electrónico la lista de temas que podemos estudiar ¿Quieres que repita los temas?';
                    sessionAttributes.flujo = 'segundosTemas';
                    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

                }
            }
        }
        else if (sessionAttributes.intentsCount < sessionAttributes.maxIntents) {
            mensajeResponse = 'Hmm, no encuentro tu número en el registro. ¿Puedes repetirlo?';
            sessionAttributes.intentsCount = sessionAttributes.intentsCount + 1;
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
        }
        else {
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
        const flow = handlerInput.requestEnvelope.request.intent.name;
        var contentText = "";
        if (sessionAttributes.temas === null) {
            var topicssessionAttributes = await getContents(handlerInput);
            handlerInput.attributesManager.setSessionAttributes(topicssessionAttributes);
        }
        const numleccionRequest = handlerInput.requestEnvelope.request.intent.slots.lesson.value;
        var idleccionRequest = '';

        try {
            idleccionRequest = handlerInput.requestEnvelope.request.intent.slots.lesson.resolutions.resolutionsPerAuthority[0].values[0].value.id;
        }
        catch (error) {

        }

        if (idleccionRequest !== '' || (idleccionRequest === '' && sessionAttributes.flujo === 'continuar')) {

            if (idleccionRequest === '') idleccionRequest = numleccionRequest;

            sessionAttributes.currentlesson = idleccionRequest;
            //Limpia lista de subtems
            sessionAttributes.listSubtopics = null;

            //Funcion para leer contenido del curso seleccionado
            await getTopicContent(host + '/topics/' + idleccionRequest, sessionAttributes.token)
                .then((response) => {
                    const data = JSON.parse(response);
                    contentText = data.contenido;

                })
                .catch((err) => {
                });

            const speakOutput = contentText + ' ';

            const repromptOutput = '¿Quieres aprender otro contenido?';

            if (idleccionRequest === '7' || idleccionRequest === '8') {
                contentText = '';

                //TODO: obtiene los subtemas
                await getSubtopicList(host + '/listSubtopicsTopic/' + idleccionRequest, sessionAttributes.token)
                    .then((response) => {
                        try {
                            const data = JSON.parse(response);

                            sessionAttributes.listSubtopics = '';
                            //TODO: obtiene los subtemas
                            data.forEach(function (item) {
                                sessionAttributes.listSubtopics += `${item.id},`;
                            });
                            sessionAttributes.listSubtopics = sessionAttributes.listSubtopics.substring(0, sessionAttributes.listSubtopics.length - 1);
                            sessionAttributes.flujo = 'subtema';
                            sessionAttributes.lastSubtopic = 0; //Indica que ve a empezar con el primer arreglo de los primeros subtemas
                        }
                        catch (error) { }

                    })
                    .catch((err) => {
                    });

                //TODO: descomentar y enviar avance al log
                await saveStudentProgress(host + '/topicslog/' ,sessionAttributes.token, sessionAttributes.persona['id'] , idleccionRequest)
                .then((response) => {
                })
                .catch((err) => {
                });

                //Si el tema es Valores Agiles se agrega un speech diferente para preguntar por los subtemas
                if (idleccionRequest === '7') {


                    if (flow === 'FlowSubtopicIntent') {
                        return handlerInput.responseBuilder
                            .speak(speakOutput + '. Como escuchaste son cuatro los valores ágiles. ')
                            .addDelegateDirective({
                                name: 'FlowIntent',
                                confirmationStatus: 'NONE',
                                slots: {}
                            })
                            .getResponse();

                    }
                    else {

                        return handlerInput.responseBuilder
                            .speak(speakOutput + '. Como escuchaste son cuatro los valores ágiles. ')
                            .addDelegateDirective({
                                name: 'FlowSubtopicIntent',
                                confirmationStatus: 'NONE',
                                slots: {}
                            })
                            .getResponse();
                    }
                }
                else if (idleccionRequest === '8') { //si el tema es principios agiles va directamente a decir los primeros 4

                    if (flow === 'FlowSubtopicIntent') {
                        return handlerInput.responseBuilder
                            .speak(speakOutput)
                            .addDelegateDirective({
                                name: 'FlowIntent',
                                confirmationStatus: 'NONE',
                                slots: {}
                            })
                            .getResponse();

                    }
                    else {

                        return handlerInput.responseBuilder
                            .speak(speakOutput)
                            .addDelegateDirective({
                                name: 'FlowSubtopicIntent',
                                confirmationStatus: 'NONE',
                                slots: {}
                            })
                            .getResponse();


                    }
                }
            }


            if (sessionAttributes.flujo === 'continuar') {

                //sessionAttributes.flujo = 'otroContenido';
                sessionAttributes.flujo = 'segundosTemas';
                handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

                await saveStudentProgress(host + '/topicslog/', sessionAttributes.token, sessionAttributes.persona['id'], idleccionRequest)
                    .then((response) => {
                    })
                    .catch((err) => {
                    });

                return handlerInput.responseBuilder
                    .speak(speakOutput + '. Para continuar con otro de los 11 contenidos, selecciona, ' + sessionAttributes.temas.primera_parte + endTextoListaPrimeraParte)
                    .reprompt('¡Adios!')
                    .getResponse();
            }
            else {
                //SET variable sesion flujo=otroContenido
                sessionAttributes.flujo = 'otroContenido';

                sessionAttributes.persona['ultimo_curso'] = idleccionRequest;
                handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
                var persona = sessionAttributes.persona;

                await saveStudentProgress(host + '/topicslog/', sessionAttributes.token, sessionAttributes.persona['id'], idleccionRequest)
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
        else {
            sessionAttributes.flujo = 'segundosTemas';
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

            return handlerInput.responseBuilder
                .speak('No encontre ese curso. Selecciona, ' + sessionAttributes.temas.primera_parte + endTextoListaPrimeraParte)
                .getResponse();
        }
    }

};

const SubtopicIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SubtopicIntent';
    },
    async handle(handlerInput) {

        const idsubtema = handlerInput.requestEnvelope.request.intent.slots.subtopic.value;
        const flow = handlerInput.requestEnvelope.request.intent.name;

        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        var currentTopic = sessionAttributes.currentlesson;


        var grouplenth = currentTopic === '7' ? 2 : 4; //si el subtema es valores agiles , divide el contenido en grupos de dos. Si es principios agiles divide grupos de 4 temas.
        let n = grouplenth * (sessionAttributes.lastSubtopic + 1); // va contando el numero de temas revisados
        let ncount = 12; //12 principios

        let arregloOriginal = sessionAttributes.listSubtopics.split(',');
        let arregloDeArreglos = [];
        for (let i = 0; i < arregloOriginal.length; i += grouplenth) { //Divide el total de temas en grupos y los asigna a un arreglo
            let pedazo = arregloOriginal.slice(i, i + grouplenth);
            arregloDeArreglos.push(pedazo);
        }

        var contentText = '';

        var currentArray = sessionAttributes.lastSubtopic;


        await getTopics(host + '/subtopics/', sessionAttributes.token)
            .then((response) => {
                const data = JSON.parse(response);
                data.forEach(function (item) {

                    if (arregloDeArreglos[currentArray].includes(item.id.toString())) { //si el contenido esta en el  arreglo actual lo agrega al speech
                        contentText += item.contenido + ' ';
                    }
                });

            })
            .catch((err) => {
            });

        if (currentArray < arregloDeArreglos.length - 1) { // si no es el ultimo grupo de subtemas agrega texto de avance y pregunta si se desea revisar los siguientes subtemas
            contentText += currentTopic === '7' ? ' Hasta aquí haz conocido los primeros ' + n + ' valores, revisaremos el resto. ' : ' Hasta aquí haz revisado ' + n + ' de los ' + ncount + ' principios ágiles, revisaremos el resto. ';



            sessionAttributes.lastSubtopic += 1;
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

            if (flow === 'FlowSubtopicIntent') {
                return handlerInput.responseBuilder
                    .speak(contentText)
                    .reprompt('¿Quieres continuar?')
                    .addDelegateDirective({
                        name: 'FlowIntent',
                        confirmationStatus: 'NONE',
                        slots: {}
                    })
                    .getResponse();

            }
            else {

                return handlerInput.responseBuilder
                    .speak(contentText)
                    .reprompt('¿Quieres continuar?')
                    .addDelegateDirective({
                        name: 'FlowSubtopicIntent',
                        confirmationStatus: 'NONE',
                        slots: {}
                    })
                    .getResponse();

            }

        }
        else { //Si es el ultimo grupo de subtemas prepara las variables de sesion para revisar otros temas y salir de los subtemas
            sessionAttributes.lastSubtopic = 0;
            sessionAttributes.flujo = 'segundosTemas';
            sessionAttributes.listSubtopics = null;
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
            return handlerInput.responseBuilder
                .speak(contentText + '. Para continuar con otro de los 11 contenidos, selecciona, ' + sessionAttributes.temas.primera_parte + endTextoListaPrimeraParte)
                .reprompt('Adios')
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
                || handlerInput.requestEnvelope.request.intent.slots.continue.resolutions.resolutionsPerAuthority[0].values[0].value.id === "1");
    },
    async handle(handlerInput) {
        // LEER VARIABLE flujo
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        if (sessionAttributes.temas === null) {
            var topicssessionAttributes = await getContents(handlerInput);
            handlerInput.attributesManager.setSessionAttributes(topicssessionAttributes);
        }
        //SI ES CONTINUAR 
        if (sessionAttributes.flujo === 'continuar') {
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
        else if (sessionAttributes.flujo === 'subtema') {
            return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: 'SubtopicIntent',
                    confirmationStatus: 'NONE',
                    slots: {
                        subtopic: {
                            name: 'subtopic',
                            value: sessionAttributes.listSubtopics.split(',')[0]
                        }
                    }
                })
                .getResponse();
        }
        else if (sessionAttributes.flujo === 'otroContenido') {
            //SI ES otroContenido

            const speakOutput = initTextoLista + sessionAttributes.temas.primera_parte + endTextoListaPrimeraParte;

            sessionAttributes.flujo = 'segundosTemas';
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakOutput)
                .getResponse();
        }
        else if (sessionAttributes.flujo === 'primerosTemas') {
            const speakOutput = sessionAttributes.temas.primera_parte + endTextoListaPrimeraParte;

            sessionAttributes.flujo = 'segundosTemas';
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakOutput)
                .getResponse();
        }
        else if (sessionAttributes.flujo === 'segundosTemas') {
            const speakOutput = sessionAttributes.temas.segunda_parte + endTextoListaSegundaParte;
            //Regresar flujo a primerosTemas
            sessionAttributes.flujo = 'primerosTemas';
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

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
                || handlerInput.requestEnvelope.request.intent.slots.continue.resolutions.resolutionsPerAuthority[0].values[0].value.id === "2");
    },
    async handle(handlerInput) {

        //LEER VARIABLE flujo
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        if (sessionAttributes.temas === null) {
            var topicssessionAttributes = await getContents(handlerInput);
            handlerInput.attributesManager.setSessionAttributes(topicssessionAttributes);
        }
        //SI ES continuar 
        if (sessionAttributes.flujo === 'continuar') {
            //sessionAttributes.flujo = 'otroContenido';

            const speakOutput = initTextoLista + sessionAttributes.temas.primera_parte + endTextoListaPrimeraParte;

            sessionAttributes.flujo = 'segundosTemas';
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakOutput)
                .getResponse();
        }
        else if (sessionAttributes.flujo === 'subtema') {

            const speakOutput = initTextoLista + sessionAttributes.temas.primera_parte + endTextoListaPrimeraParte;
            sessionAttributes.lastSubtopic = 0;
            sessionAttributes.flujo = 'segundosTemas';
            sessionAttributes.listSubtopics = null;
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt('¿Quieres escuchar los siguientes temas?')
                .getResponse();
        }
        else if (sessionAttributes.flujo === 'otroContenido') {
            //SI ES otroContenido
            const speakOutput = '¡Adiós!';

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .getResponse();
        }
        else if (sessionAttributes.flujo === 'segundosTemas') {
            sessionAttributes.flujo = 'primerosTemas';
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
            //SI ES otroContenido
            const speakOutput = '¿Con cuál tema quieres iniciar?';
            const speakReprompt = 'Hmm, no escuche tu respuesta ¿Quieres que te repita los primeros 5 temas?';

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakReprompt)
                .getResponse();
        }
    }
};


const YesSubtopicIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'FlowSubtopicIntent'
            && (handlerInput.requestEnvelope.request.intent.slots.review.value === 'si'
                || handlerInput.requestEnvelope.request.intent.slots.review.value === 'sí'
                || handlerInput.requestEnvelope.request.intent.slots.review.resolutions.resolutionsPerAuthority[0].values[0].value.id === "1");
    },
    async handle(handlerInput) {
        // LEER VARIABLE flujo
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        if (sessionAttributes.temas === null) {
            var topicssessionAttributes = await getContents(handlerInput);
            handlerInput.attributesManager.setSessionAttributes(topicssessionAttributes);
        }
        if (sessionAttributes.flujo === 'subtema') {
            return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: 'SubtopicIntent',
                    confirmationStatus: 'NONE',
                    slots: {
                        subtopic: {
                            name: 'subtopic',
                            value: sessionAttributes.listSubtopics.split(',')[0]
                        }
                    }
                })
                .getResponse();
        }
        else if (sessionAttributes.flujo === 'continuar') {
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
        else if (sessionAttributes.flujo === 'otroContenido') {
            //SI ES otroContenido

            const speakOutput = initTextoLista + sessionAttributes.temas.primera_parte + endTextoListaPrimeraParte;

            sessionAttributes.flujo = 'segundosTemas';
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakOutput)
                .getResponse();
        }
        else if (sessionAttributes.flujo === 'primerosTemas') {
            const speakOutput = sessionAttributes.temas.primera_parte + endTextoListaPrimeraParte;

            sessionAttributes.flujo = 'segundosTemas';
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakOutput)
                .getResponse();
        }
        else if (sessionAttributes.flujo === 'segundosTemas') {
            const speakOutput = sessionAttributes.temas.segunda_parte + endTextoListaSegundaParte;
            //Regresar flujo a primerosTemas
            sessionAttributes.flujo = 'primerosTemas';
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakOutput)
                .getResponse();
        }
    }
};


const NoSubtopicIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'FlowSubtopicIntent'
            && (handlerInput.requestEnvelope.request.intent.slots.review.value === 'no'
                || handlerInput.requestEnvelope.request.intent.slots.review.value === 'no'
                || handlerInput.requestEnvelope.request.intent.slots.review.resolutions.resolutionsPerAuthority[0].values[0].value.id === "2");
    },
    async handle(handlerInput) {
        // LEER VARIABLE flujo
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        if (sessionAttributes.flujo === 'subtema') {

            const speakOutput = initTextoLista + sessionAttributes.temas.primera_parte + endTextoListaPrimeraParte;
            sessionAttributes.lastSubtopic = 0;
            sessionAttributes.flujo = 'segundosTemas';
            sessionAttributes.listSubtopics = null;
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt('¿Quieres escuchar los siguientes temas?')
                .getResponse();
        }
        else if (sessionAttributes.flujo === 'continuar') {
            //sessionAttributes.flujo = 'otroContenido';

            const speakOutput = initTextoLista + sessionAttributes.temas.primera_parte + endTextoListaPrimeraParte;

            sessionAttributes.flujo = 'segundosTemas';
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakOutput)
                .getResponse();
        }
        else if (sessionAttributes.flujo === 'otroContenido') {
            //SI ES otroContenido
            const speakOutput = '¡Adiós!';

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .getResponse();
        }
        else if (sessionAttributes.flujo === 'segundosTemas') {
            sessionAttributes.flujo = 'primerosTemas';
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
            //SI ES otroContenido
            const speakOutput = '¿Con cuál tema quieres iniciar?';
            const speakReprompt = 'Hmm, no escuche tu respuesta ¿Quieres que te repita los primeros 5 temas?';

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakReprompt)
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
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const speakOutput = 'Los temas son: ' + sessionAttributes.temas.primera_parte + endTextoListaPrimeraParte;
        sessionAttributes.flujo = 'segundosTemas';
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

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
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        sessionAttributes.flujo = 'segundosTemas';
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
        const speakOutput = 'Hmm, no entendí tu respuesta, Estos son los temas que podemos estudiar. ' + sessionAttributes.temas.primera_parte + endTextoListaPrimeraParte;

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
            .speak(speakOutput + ' ¿Quieres continuar?')
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
        'username': 'alexa', 'password': 'Exo212021'
    });

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    }

    const req = client.request(url, options, (res) => {
        var token = '';
        token = res.headers['authorization'];
        resolve(token);
    });
    req.on('error', (err) => reject(err));

    req.write(postData);
    req.end();

});


const getStudentData = (url, token) => new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? require('https') : require('http');
    const options = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        }
    };
    const request = client.get(url, options, (response) => {
        if (response.statusCode < 200 || response.statusCode > 299) {
            reject(new Error(`Failed with status code: ${response.statusCode}`));
        }
        const body = [];
        response.on('data', (chunk) => body.push(chunk));
        response.on('end', () => resolve(body.join('')));
    });
    request.on('error', (err) => reject(err));

});

const getStudentTopics = (url, token) => new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? require('https') : require('http');
    const options = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        }
    };
    const request = client.get(url, options, (response) => {
        if (response.statusCode < 200 || response.statusCode > 299) {
            reject(new Error(`Failed with status code: ${response.statusCode}`));
        }
        const body = [];
        response.on('data', (chunk) => body.push(chunk));
        response.on('end', () => resolve(body.join('')));
    });
    request.on('error', (err) => reject(err));

});

const getTopics = (url, token) => new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? require('https') : require('http');
    const options = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        }
    };
    const request = client.get(url, options, (response) => {
        if (response.statusCode < 200 || response.statusCode > 299) {
            reject(new Error(`Failed with status code: ${response.statusCode}`));
        }
        const body = [];
        response.on('data', (chunk) => body.push(chunk));
        response.on('end', () => resolve(body.join('')));
    });
    request.on('error', (err) => reject(err));

});

const getTopicContent = (url, token) => new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? require('https') : require('http');
    const options = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        }
    };
    const request = client.get(url, options, (response) => {
        if (response.statusCode < 200 || response.statusCode > 299) {
            reject(new Error(`Failed with status code: ${response.statusCode}`));
        }
        const body = [];
        response.on('data', (chunk) => body.push(chunk));
        response.on('end', () => resolve(body.join('')));
    });
    request.on('error', (err) => reject(err));

});

const getSubtopicList = (url, token) => new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? require('https') : require('http');
    const options = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        }
    };
    const request = client.get(url, options, (response) => {
        if (response.statusCode < 200 || response.statusCode > 299) {
            reject(new Error(`Failed with status code: ${response.statusCode}`));
        }
        const body = [];
        response.on('data', (chunk) => body.push(chunk));
        response.on('end', () => resolve(body.join('')));
    });
    request.on('error', (err) => reject(err));

});



const saveStudentProgress = (url, token, id_persona, id_ultimotema) => new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? require('https') : require('http');

    const postData = JSON.stringify(
        {
            "id_estudiante": id_persona,
            "id_tema": id_ultimotema,
            "fecha": null
        }
    );

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
            'Content-Length': Buffer.byteLength(postData)
        }
    }

    const req = client.request(url, options, (res) => {
        if (res.statusCode < 200 || res.statusCode > 299) {
            reject(new Error(`Failed with status code: ${res.statusCode}`));
        }
        if (res.statusCode === 200) {
            resolve('ok');

        }
    });
    req.on('error', (err) => reject(err));

    req.write(postData);
    req.end();
});


/*METHODS*/

async function getContents(handlerInput) {
    //const attributesManager = handlerInput.attributesManager;
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var token = sessionAttributes.token;
    await getTopics(host + '/listTopics/', token)
        .then((response) => {
            var contTemas = 1;
            lstPrimeraMitadContenidos = '';
            lstSegundaMitadContenidos = '';
            const data = JSON.parse(response);
            data.forEach(function (item) {
                if (contTemas <= 5) {
                    //primeros 5 temas
                    lstPrimeraMitadContenidos += `${item.id}, ${item.titulo}. `;
                }
                else {
                    //ultimos n temas
                    lstSegundaMitadContenidos += `${item.id}, ${item.titulo}. `;
                }
               
                contTemas++;

            });

            var listaTemas = {
                primera_parte: lstPrimeraMitadContenidos,
                segunda_parte: lstSegundaMitadContenidos
            };
            sessionAttributes.temas = listaTemas;
            return sessionAttributes;
        })
        .catch((err) => {
        });
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
        SubtopicIntentHandler,
        YesIntentHandler,
        NoIntentHandler,
        YesSubtopicIntentHandler,
        NoSubtopicIntentHandler,
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