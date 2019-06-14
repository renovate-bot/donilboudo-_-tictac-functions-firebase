
// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
import functions = require('firebase-functions');
import admin = require('firebase-admin');
import twilio = require('twilio');
const uuidv4 = require('uuid/v4');

// The Firebase Admin SDK to access the Firebase Realtime Database.
admin.initializeApp();

const db = admin.firestore();

//const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
const accountSid = 'ACddcbd5d520641c2a133c8f61ab00d9e0';
const authToken = 'c03191e41204cdbea34a7d1c797ab7ad';

const client = twilio(accountSid, authToken);
const twilioNumber = '+15149003445' // your twilio phone number

exports.deliveryStatusChanged = functions.firestore
    .document('deliveries/{deliveryId}')
    .onUpdate((change, context) => {
        const delivery = change.after.data();
        if (delivery) {
            if (delivery.status === 'ASSIGN_TO_DELIVER') {
                let delivererPhone = delivery.deliverer.phone.replace(/ /g, '');
                delivererPhone = delivererPhone.replace('(', '');
                delivererPhone = delivererPhone.replace(')', '');
                delivererPhone = delivererPhone.replace('-', '');
                console.log('Deliver phone number:', delivererPhone);

                let senderName = delivery.senderName;
                let senderPhone = delivery.senderPhone;
                if (delivery.client) {
                    senderName = delivery.client.name;
                    senderPhone = delivery.client.phone;
                }

                let senderFullAddress = '';
                if (delivery.senderAddress) {
                    senderFullAddress += delivery.senderAddress;
                }
                if (delivery.senderAddressDetails) {
                    senderFullAddress += ' ' + delivery.senderAddressDetails;
                }

                let receiverFullAddress = '';
                if (delivery.receiverAddress) {
                    receiverFullAddress += delivery.receiverAddress;
                }
                if (delivery.receiverAddressDetails) {
                    receiverFullAddress += ' ' + delivery.receiverAddressDetails;
                }

                const textMessage = {
                    body:
                        `Demande de livraison:\nNom du demandeur: ${senderName}.\nPhone: ${senderPhone}.\nLieu: ${senderFullAddress}.\n\nNom du receveur: ${delivery.receiverName}.\nPhone: ${delivery.receiverPhone}.\nLieu: ${receiverFullAddress}.
                    `,
                    to: delivererPhone,  // Text to this number
                    from: twilioNumber // From a valid Twilio number
                }
                return client.messages.create(textMessage);
            }
        }
        return '';
    });

exports.addNewDeliveryRequestFromWebsite = functions.firestore
    .document('ttdeliveries/{deliveryId}')
    .onCreate(async (snap, context) => {
        const request = snap.data();
        if (request) {
            const requestDate = formatDateTime(new Date());
            const origin = 'WEBSITE';

            const packageType = request.packageType;
            let paymentMethod = request.paymentMethod;
            if (paymentMethod === 'Espèce') {
                paymentMethod = 'CASH';
            } else if (paymentMethod === 'Mobicash') {
                paymentMethod = 'MOBICASH';
            } else if (paymentMethod === 'Orange Money') {
                paymentMethod = 'ORANGE_MONEY;'
            }

            const totalCost = request.totalCost;
            // const duration = request.duration;
            const distance = request.distance;
            const deliveryNumber = request.trackingNumber;

            const senderName = request.senderName;
            const senderPhone = request.senderPhone;

            let senderAddress = request.placeOfOrigin;
            if (request.senderAddressDetails) {
                senderAddress += ', ' + request.originLocation;
            }

            const receiverName = request.receiverName;
            const receiverPhone = request.receiverPhone;
            let receiverAddress = request.placeOfDelivery;
            if (request.receiverAddressDetails) {
                receiverAddress += ', ' + request.deliveryLocation;
            }

            const status = 'WAITING_FOR_APPROVE';

            const data = {
                id: createID(),
                deliveryNumber: deliveryNumber,
                requestDate: requestDate,
                startDate: '',
                completeDate: '',
                cancelDate: '',
                origin: origin,
                packageType: packageType,
                paymentMethod: paymentMethod,
                senderName: senderName,
                senderPhone: senderPhone,
                senderAddress: senderAddress,
                senderComments: '',
                receiverName: receiverName,
                receiverPhone: receiverPhone,
                receiverAddress: receiverAddress,
                receiverComments: '',
                status: status,
                distance: distance,
                price: totalCost
            }
            try {
                console.log(data);
                await db.collection('deliveries').doc(data.deliveryNumber).set(Object.assign({}, data));
            } catch (error) {
                console.log(error);
            }
        }
    });

function formatDateTime(date: Date): string {
    let month = (date.getMonth() + 1).toString();
    if (month.length === 1) {
        month = '0' + month;
    }
    let day = date.getDate().toString();
    if (day.length === 1) {
        day = '0' + day;
    }
    let hours = date.getHours().toString();
    if (date.getHours().toString().length === 1) {
        hours = '0' + date.getHours().toString();
    }
    let minutes = date.getMinutes().toString();
    if (date.getMinutes().toString().length === 1) {
        minutes = '0' + date.getMinutes().toString();
    }

    return day + '-' + month + '-' + date.getFullYear() + ' ' + hours + ':' + minutes;
}

function createID(): string {
    const uuid = uuidv4();
    const uuidArray = uuid.split('-');
    const now = new Date();

    let month = (now.getMonth() + 1).toString();
    if (month.length === 1) {
        month = '0' + month;
    }
    let day = now.getDate().toString();
    if (day.length === 1) {
        day = '0' + day;
    }
    let hours = now.getHours().toString();
    if (now.getHours().toString().length === 1) {
        hours = '0' + now.getHours().toString();
    }
    let minutes = now.getMinutes().toString();
    if (now.getMinutes().toString().length === 1) {
        minutes = '0' + now.getMinutes().toString();
    }

    let id = 'D' + now.getFullYear() + '' + month + '' + day + '' + hours + '' + minutes;

    uuidArray.forEach((item: any) => {
        id += item.substring(0, 1);
    });
    id = id.substring(0, id.length - 3);

    return id.toUpperCase();
}