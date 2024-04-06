import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from 'axios';

import { Account } from "./Account";
import { Preferences } from "./Preferences";
import { CoefficientManager } from "./CoefficientsManager";
import { calculateAllPeriodAverages } from "./Period";
import { resetSubjectColors } from "../utils/Colors";
import { encodeStringValueToUTF8 } from "../utils/Utils";
import { Logger } from "../utils/Logger";


export class UserData {
  static connected = false;
  static connecting = false;
  static unavailableServers = false;

  static mainAccount = new Account();
  static childrenAccounts = new Map();

  static API_URL = "https://api.ecoledirecte.com";
  static CUSTOM_API_URL = "https://api.moyennesed.my.to/test-api";
  static usedURL = "";

  static token = "";
  static currentYearPeriod = "";

  static tempUsername;
  static tempPassword;
  static isWaitingForConfirmation = false;
  static async login(username, password, validate=true, validateIndex=0, openDoubleAuthPopup) {
    this.usedURL = this.API_URL;
    if (username.substring(0, 11) == "demoaccount") {
      this.usedURL = this.CUSTOM_API_URL;
      Logger.info("Using demo API...");
    }

    Logger.login(`Logging-in ${username}...`);
    this.connected = false;
    this.connecting = true;
    this.unavailableServers = false;

    this.tempUsername = username;
    this.tempPassword = password;

    // Get login id
    var cn = ""; var cv = "";
    const loginIDs = JSON.parse(await AsyncStorage.getItem("loginIDs"));
    if (loginIDs) {
      cn = loginIDs.cn;
      cv = loginIDs.cv;
    }

    const credentials = {
      "identifiant": encodeStringValueToUTF8(username),
      "motdepasse": encodeStringValueToUTF8(password),
      "fa": [
        {
          "cn": cn,
          "cv": cv,
        }
      ]
    };
    console.log(password);
    console.log(credentials);

    var response = await axios.post(
      `${this.usedURL}/v3/login.awp?v=4`,
      `data=${JSON.stringify(credentials)}`,
      { headers: { "Content-Type": "text/plain" } },
    ).catch(error => {
      Logger.login(`An error occured while logging in : ${error}`, true);
    });
    response ??= { status: 500 };
    this.loginLogs = response.data;

    var success = 0;
    switch (response.status) {
      case 200:
        Logger.login("API request successful");
        switch (response.data.code) {
          case 200:
            Logger.login("Login successful !");
            this.token = response.data.token;
            this.isWaitingForConfirmation = false;
            if (validate || response.data.data.accounts.length == 1) { await this.validateWantedAccountID(validateIndex ? validateIndex : 0); }
            else { this.isWaitingForConfirmation = true; }
            success = 1;
            break;
          case 250:
            Logger.login("Account needs confirmation...");
            this.token = response.data.token;
            success = 2;
            await AsyncStorage.setItem("credentials", JSON.stringify({
              "username": username,
              "password": password,
            }));
            openDoubleAuthPopup();
            break;
          case 505: // Wrong password
            Logger.login(`Couldn't connect, wrong password for ${username}`);
            break;
          default:
            Logger.login(`API responded with unknown code ${response.data.code}`, true);
            success = -1;
            break;
        }
        break;
      default:
        Logger.login("API request failed", true);
        success = -1;
        break;
    }

    this.connecting = false;
    this.connected = success == 1;
    this.unavailableServers = success == -1;
    return success;
  }
  static async validateWantedAccountID(index) {
    await AsyncStorage.setItem("credentials", JSON.stringify({
      "username": this.tempUsername,
      "password": this.tempPassword,
      "index": index
    }));
    this.formatReceivedLoginData(this.loginLogs.data.accounts.at(index));
    this.isWaitingForConfirmation = false;
  }
  static formatReceivedLoginData(jsonData) {
    this.currentYearPeriod = jsonData.anneeScolaireCourante;

    this.mainAccount.init(jsonData, false);
    if (this.marksDataCache.has(this.mainAccount.id.toString()) && this.marksDataCache.get(this.mainAccount.id.toString())) {
      this.mainAccount.periods = this.marksDataCache.get(this.mainAccount.id.toString());
    }
    
    Logger.core(`Created account ${this.mainAccount.fullName()} (${this.mainAccount.id}) (${this.mainAccount.isParent ? "parent" : "student"} account)`);
    this.childrenAccounts.clear();
    if (this.mainAccount.isParent) {
      jsonData.profile.eleves.forEach(childData => {
        let childAccount = new Account();
        childAccount.init(childData, true);
        Logger.core("-> Created child account " + childAccount.fullName() + " (" + childAccount.id + ")");
        if (this.marksDataCache.has(childAccount.id.toString()) && this.marksDataCache.get(childAccount.id.toString())) {
          childAccount.periods = this.marksDataCache.get(childAccount.id.toString());
        }
        this.childrenAccounts.set(childAccount.id.toString(), childAccount);
      });
    }
  }

  static async refreshLogin(openDoubleAuthPopup) {
    Logger.info("Refreshing login...");
    const credentials = JSON.parse(await AsyncStorage.getItem("credentials"));
    if (credentials) {
      return await this.login(credentials.username, credentials.password, true, credentials.index, openDoubleAuthPopup);
    }
    return -1;
  }

  static async getMarks(accountID, openDoubleAuthPopup) {
    this.unavailableServers = false;

    Logger.marks(`Getting marks for account ${accountID}...`);
    var response = await axios.post(
      `${this.usedURL}/v3/eleves/${accountID}/notes.awp?verbe=get&v=4`,
      'data={"anneeScolaire": ""}',
      { headers: { "Content-Type": "text/plain", "X-Token": this.token } },
    ).catch(error => {
      Logger.marks(`An error occured while getting marks : ${error}`, true);
    });
    response ??= { status: 500 };
    this.marksLogs[accountID] = response.data;
    
    switch (response.status) {
      case 200:
        Logger.marks("API request successful");
        switch (response.data.code) {
          case 200:
            Logger.marks(`Got marks for account ${accountID} !`);
            this.token = response.data.token;
            return response.data.data;
          case 520: // Outdated token
            Logger.info("Outdated token, reconnecting...");
            const reloginSuccessful = await this.refreshLogin(openDoubleAuthPopup);
            if (reloginSuccessful) {
              return await this.getMarks(accountID);
            }
            return 0;
          default:
            Logger.marks(`API responded with unknown code ${response.data.code}`, true);
            this.unavailableServers = true;
            return -1;
        }
      default:
        Logger.marks("API request failed", true);
        this.unavailableServers = true;
        return -1;
    }
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
    Logger.info("Logging out...");
    this.connected = false;
    this.connecting = false;
    this.mainAccount.erase();
    this.childrenAccounts.clear();
    this.token = "";
    this.currentYearPeriod = "";
    this.gotMarksFor.clear();
    this.marksNeedUpdate.clear();
    this.marksDataCache.clear();
    await Preferences.erase();
    await CoefficientManager.erase();
    this.temporaryProfilePhoto = "";
    this.lastBugReport = null;
    resetSubjectColors();
    await AsyncStorage.clear();
    Logger.info("Logged out !");
  }

  // Profile photo
  static temporaryProfilePhoto = "";
  static async loadProfilePhoto(account, callback) {
    return await AsyncStorage.getItem("photo").then(async (cachePhoto) => {
      if (cachePhoto) {
        Logger.core("Loaded profile photo from cache");
        this.temporaryProfilePhoto = cachePhoto;
        callback(cachePhoto);
      } else {
        Logger.core("Loading profile photo...");
        if (!account.photoURL) { return null; }
        return await fetch(`https:${account.photoURL}`, { headers: { 'Referer': `http:${account.photoURL}`, 'Host': 'doc1.ecoledirecte.com' } })
        .then(async (response) => {
          let blob = await response.blob();
          let fileReaderInstance = new FileReader();
          fileReaderInstance.readAsDataURL(blob); 
          fileReaderInstance.onload = () => {
            let base64data = fileReaderInstance.result;
            this.temporaryProfilePhoto = base64data;
            AsyncStorage.setItem("photo", base64data);
            Logger.core("Got profile photo !");
            callback(base64data);
          }
        })
        .catch(error => {
          Logger.core("Error getting profile photo: " + error, true);
          this.temporaryProfilePhoto = "";
          AsyncStorage.removeItem("photo");
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
    await AsyncStorage.getItem("cache").then(jsonValue => {
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
    
    await AsyncStorage.setItem("cache", JSON.stringify({
      gotMarksFor: Array.from(this.gotMarksFor.entries()),
      mainAccount: this.mainAccount.toCache(),
      childrenAccounts: Array.from(savableChildrenAccounts.entries()),
    }));
  }

  // Logs (for bug reports)
  static loginLogs = {};
  static marksLogs = {};
  static lastBugReport = null;
  static bugReportCooldown = 1000 * 60 * 60 * 24; // 1 day
}