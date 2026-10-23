import { Platform } from "react-native";

import { Account } from "./Account";
import { Preferences } from "./Preferences";
import { CoefficientManager } from "./CoefficientsManager";
import { calculateAllPeriodAverages } from "./Period";
import * as EcoleDirecteAPI from "./EcoleDirecteAPI";
import { resetSubjectColors } from "../utils/Colors";
import { Storage, SecretStorage, SECRET_KEYS } from "../utils/Storage";
import { Logger } from "../utils/Logger";


export class UserData {
  static connected = false;
  static connecting = false;
  static unavailableServers = false;

  static mainAccount = new Account();
  static childrenAccounts = new Map();

  static currentYearPeriod = "";

  // Jeton de session ÉcoleDirecte (en mémoire seulement, voir core/EcoleDirecteAPI.js)
  static get token() { return EcoleDirecteAPI.getSessionToken(); }

  // Identifiants : gardés en mémoire le temps de choisir le compte, puis rangés dans le
  // stockage sécurisé du téléphone (en mémoire seulement sur le web). Jamais journalisés.
  static tempUsername;
  static tempPassword;
  static isWaitingForConfirmation = false;

  static async hasSavedCredentials() {
    return Boolean(await SecretStorage.getItem(SECRET_KEYS.credentials));
  }
  static async saveCredentials(username, password, index) {
    await SecretStorage.setItem(SECRET_KEYS.credentials, JSON.stringify({ username, password, index }));
  }
  static async loadCredentials() {
    const json = await SecretStorage.getItem(SECRET_KEYS.credentials);
    try { return json ? JSON.parse(json) : null; } catch (e) { return null; }
  }

  // Codes de confiance (cn/cv) donnés par ÉcoleDirecte après une double authentification réussie
  static async loadTrustedDevice() {
    const json = await SecretStorage.getItem(SECRET_KEYS.trustedDevice);
    try { return json ? JSON.parse(json) : null; } catch (e) { return null; }
  }
  static async saveTrustedDevice(cn, cv) {
    await SecretStorage.setItem(SECRET_KEYS.trustedDevice, JSON.stringify({ cn, cv }));
  }
  static async forgetTrustedDevice() {
    await SecretStorage.removeItem(SECRET_KEYS.trustedDevice);
  }

  static async login(username, password, validate=true, validateIndex=0, openDoubleAuthPopup) {
    Logger.login("Connexion en cours...");
    this.connected = false;
    this.connecting = true;
    this.unavailableServers = false;

    this.tempUsername = username;
    this.tempPassword = password;

    const trustedDevice = await this.loadTrustedDevice();
    const response = await EcoleDirecteAPI.login(username, password, trustedDevice);
    this.loginLogs = response.json ?? {};

    var success = 0;
    if (response.httpStatus === 200 && response.json) {
      switch (response.json.code) {
        case 200:
          Logger.login("Connexion réussie");
          this.isWaitingForConfirmation = false;
          if (validate || response.json.data.accounts.length == 1) { await this.validateWantedAccountID(validateIndex ? validateIndex : 0); }
          else { this.isWaitingForConfirmation = true; }
          success = 1;
          break;
        case 250:
          Logger.login("ÉcoleDirecte demande la double authentification");
          success = 2;
          await this.saveCredentials(username, password, validateIndex ?? 0);
          if (openDoubleAuthPopup) { openDoubleAuthPopup(); }
          break;
        case 505: // Identifiant ou mot de passe incorrect
          Logger.login("Identifiant ou mot de passe incorrect");
          break;
        default:
          Logger.login(`ÉcoleDirecte a répondu avec un code inattendu : ${response.json.code}`, true);
          success = -1;
          break;
      }
    } else {
      Logger.login(`Échec de l'appel à ÉcoleDirecte (HTTP ${response.httpStatus})`, true);
      success = -1;
    }

    this.connecting = false;
    this.connected = success == 1;
    this.unavailableServers = success == -1;
    return success;
  }
  static async validateWantedAccountID(index) {
    await this.saveCredentials(this.tempUsername, this.tempPassword, index);
    this.tempUsername = undefined;
    this.tempPassword = undefined;
    this.formatReceivedLoginData(this.loginLogs.data.accounts.at(index));
    this.isWaitingForConfirmation = false;
  }
  static formatReceivedLoginData(jsonData) {
    this.currentYearPeriod = jsonData.anneeScolaireCourante;

    this.mainAccount.init(jsonData, false);
    if (this.marksDataCache.has(this.mainAccount.id.toString()) && this.marksDataCache.get(this.mainAccount.id.toString())) {
      this.mainAccount.periods = this.marksDataCache.get(this.mainAccount.id.toString());
    }
    
    Logger.core(`Compte chargé (${this.mainAccount.isParent ? "parent" : "élève"})`);
    this.childrenAccounts.clear();
    if (this.mainAccount.isParent) {
      jsonData.profile.eleves.forEach(childData => {
        let childAccount = new Account();
        childAccount.init(childData, true);
        if (this.marksDataCache.has(childAccount.id.toString()) && this.marksDataCache.get(childAccount.id.toString())) {
          childAccount.periods = this.marksDataCache.get(childAccount.id.toString());
        }
        this.childrenAccounts.set(childAccount.id.toString(), childAccount);
      });
      Logger.core(`${this.childrenAccounts.size} enfant(s) sur le compte`);
    }
  }

  static async refreshLogin(openDoubleAuthPopup) {
    Logger.info("Reconnexion...");
    const credentials = await this.loadCredentials();
    if (credentials) {
      return await this.login(credentials.username, credentials.password, true, credentials.index, openDoubleAuthPopup);
    }
    return -1;
  }

  // Renvoie les données de notes, ou -1 en cas d'échec
  static async getMarks(accountID, openDoubleAuthPopup, alreadyRetried=false) {
    this.unavailableServers = false;

    Logger.marks("Récupération des notes...");
    const response = await EcoleDirecteAPI.getMarks(accountID);
    this.marksLogs[accountID] = response.json;

    if (response.httpStatus === 200 && response.json) {
      switch (response.json.code) {
        case 200:
          Logger.marks("Notes reçues");
          return response.json.data;
        case 520: // Jeton invalide
        case 525: // Jeton expiré
          if (alreadyRetried) { break; }
          Logger.info("Session expirée, reconnexion...");
          const reloginResult = await this.refreshLogin(openDoubleAuthPopup);
          if (reloginResult === 1) {
            return await this.getMarks(accountID, openDoubleAuthPopup, true);
          }
          return -1;
        default:
          Logger.marks(`ÉcoleDirecte a répondu avec un code inattendu : ${response.json.code}`, true);
          break;
      }
    } else {
      Logger.marks(`Échec de l'appel à ÉcoleDirecte (HTTP ${response.httpStatus})`, true);
    }
    this.unavailableServers = true;
    return -1;
  }

  static recalculateAllCoefficients() {
    function recalculatePeriodCoefficients(period) {
      period.marks.forEach(mark => {
        mark.coefficient = CoefficientManager.getDefaultEDMarkCoefficient(mark.id);
        mark.coefficientType = 0;
        var newCoefficient;
        if (Preferences.allowGuessMarkCoefficients) {
          newCoefficient = CoefficientManager.getGuessedMarkCoefficient(mark.id, mark.title);
          if (newCoefficient) {
            mark.coefficient = newCoefficient;
            mark.coefficientType = 1;
          }
        }
        if (Preferences.allowCustomCoefficients) {
          newCoefficient = CoefficientManager.getCustomMarkCoefficient(mark.id);
          if (newCoefficient != undefined) {
            mark.coefficient = newCoefficient;
            mark.coefficientType = 2;
          }
        }
      });
      period.subjects.forEach(subject => {
        subject.coefficient = CoefficientManager.getDefaultEDSubjectCoefficient(subject.id);
        subject.coefficientType = 0;
        let newCoefficient;
        if (Preferences.allowGuessSubjectCoefficients) {
          newCoefficient = CoefficientManager.getGuessedSubjectCoefficient(subject.id, subject.code, subject.subCode, subject.name);
          if (newCoefficient) {
            subject.coefficient = newCoefficient;
            subject.coefficientType = 1;
          }
        }
        if (Preferences.allowCustomCoefficients) {
          newCoefficient = CoefficientManager.getCustomSubjectCoefficient(subject.id);
          if (newCoefficient != undefined) {
            subject.coefficient = newCoefficient;
            subject.coefficientType = 2;
          }
        }

        subject.subSubjects.forEach(subSubject => {
          subSubject.coefficient = CoefficientManager.getDefaultEDSubjectCoefficient(subSubject.id);
          subSubject.coefficientType = 0;
          if (Preferences.allowGuessSubjectCoefficients) {
            newCoefficient = CoefficientManager.getGuessedSubjectCoefficient(subSubject.id, subSubject.code, subSubject.subCode, subSubject.name);
            if (newCoefficient) {
              subSubject.coefficient = newCoefficient;
              subSubject.coefficientType = 1;
            }
          }
          if (Preferences.allowCustomCoefficients) {
            newCoefficient = CoefficientManager.getCustomSubjectCoefficient(subSubject.id);
            if (newCoefficient != undefined) {
              subSubject.coefficient = newCoefficient;
              subSubject.coefficientType = 2;
            }
          }
        });
      });
      calculateAllPeriodAverages(period);
    }
    
    if (this.mainAccount.isParent) {
      this.childrenAccounts.forEach(childAccount => {
        for (let [_, period] of childAccount.periods) {
          recalculatePeriodCoefficients(period);
        }
      });
    } else {
      this.mainAccount.periods.forEach(period =>  {
        recalculatePeriodCoefficients(period);
      });
    }

    CoefficientManager.save();
    this.saveCache();
  }

  static async logout() {
    Logger.info("Déconnexion...");
    this.connected = false;
    this.connecting = false;
    this.mainAccount.erase();
    this.childrenAccounts.clear();
    EcoleDirecteAPI.resetSession();
    this.tempUsername = undefined;
    this.tempPassword = undefined;
    this.loginLogs = {};
    this.marksLogs = {};
    this.currentYearPeriod = "";
    this.gotMarksFor.clear();
    this.marksNeedUpdate.clear();
    this.marksDataCache.clear();
    await Preferences.erase();
    await CoefficientManager.erase();
    this.temporaryProfilePhoto = "";
    this.lastBugReport = null;
    resetSubjectColors();
    await Storage.clear();
    await SecretStorage.clear(); // identifiants et codes de confiance effacés du téléphone
    Logger.info("Déconnecté");
  }

  // Profile photo
  static temporaryProfilePhoto = "";
  static async loadProfilePhoto(account, callback) {
    // Sur le web, la photo n'est pas récupérable (serveur ÉcoleDirecte, CORS) : icône par défaut.
    if (Platform.OS === "web") { callback(""); return null; }
    return await Storage.getItem("photo").then(async (cachePhoto) => {
      if (cachePhoto) {
        Logger.core("Photo de profil chargée depuis le cache");
        this.temporaryProfilePhoto = cachePhoto;
        callback(cachePhoto);
      } else {
        Logger.core("Récupération de la photo de profil...");
        if (!account.photoURL) { return null; }
        return await fetch(`https:${account.photoURL}`, { headers: { 'Referer': `http:${account.photoURL}`, 'Host': 'doc1.ecoledirecte.com' } })
        .then(async (response) => {
          let blob = await response.blob();
          let fileReaderInstance = new FileReader();
          fileReaderInstance.readAsDataURL(blob); 
          fileReaderInstance.onload = () => {
            let base64data = fileReaderInstance.result;
            this.temporaryProfilePhoto = base64data;
            Storage.setItem("photo", base64data);
            Logger.core("Photo de profil reçue");
            callback(base64data);
          }
        })
        .catch(error => {
          Logger.core("Photo de profil indisponible", true);
          this.temporaryProfilePhoto = "";
          Storage.removeItem("photo");
          callback("");
        });
      }
    });
  }

  // Cache
  static gotMarksFor = new Map();
  static marksNeedUpdate = new Map();
  static marksDataCache = new Map();
  static async loadCache() {
    await Storage.getItem("cache").then(jsonValue => {
      if (jsonValue != null) {
        let cache = JSON.parse(jsonValue);

        this.mainAccount = new Account();
        this.mainAccount.fromCache(cache.mainAccount);
        if (!this.mainAccount.isParent) { this.marksDataCache.set(this.mainAccount.id.toString(), this.mainAccount.periods); }
        this.childrenAccounts = new Map();

        let cacheChildrenAccounts = new Map(cache.childrenAccounts);
        cacheChildrenAccounts.forEach((cacheChildAccount) => {
          let childAccount = new Account();
          childAccount.fromCache(cacheChildAccount);
          this.childrenAccounts.set(childAccount.id.toString(), childAccount);
          this.marksDataCache.set(childAccount.id.toString(), childAccount.periods); 
        });

        this.gotMarksFor = new Map(cache.gotMarksFor);
        this.marksNeedUpdate = new Map(cache.gotMarksFor);
      }
    });
  }
  static async saveCache() {
    var savableChildrenAccounts = new Map();
    this.childrenAccounts.forEach((childAccount, key) => { savableChildrenAccounts.set(key, childAccount.toCache()); });
    
    await Storage.setItem("cache", JSON.stringify({
      gotMarksFor: Array.from(this.gotMarksFor.entries()),
      mainAccount: this.mainAccount.toCache(),
      childrenAccounts: Array.from(savableChildrenAccounts.entries()),
    }));
  }

  // Dernières réponses d'ÉcoleDirecte, en mémoire seulement, pour le rapport de diagnostic
  // (anonymisé avant tout partage, voir utils/Diagnostic.js)
  static loginLogs = {};
  static marksLogs = {};
  static lastBugReport = null;
}