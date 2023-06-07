import { defineStore } from 'pinia';
import { apiKeyService, formService, rbacService } from '~/services';
import { useNotificationStore } from '~/store/notification';
import { IdentityMode, NotificationTypes } from '~/utils/constants';
import { generateIdps, parseIdps } from '~/utils/transformUtils';
import { useI18n } from 'vue-i18n';

const genInitialSchedule = () => ({
  enabled: null,
  scheduleType: null,
  openSubmissionDateTime: null,
  keepOpenForTerm: null,
  keepOpenForInterval: null,
  closingMessageEnabled: null,
  closingMessage: null,
  closeSubmissionDateTime: null,
  repeatSubmission: {
    enabled: null,
    repeatUntil: null,
    everyTerm: null,
    everyIntervalType: null,
  },
  allowLateSubmissions: {
    enabled: null,
    forNext: {
      term: null,
      intervalType: null,
    },
  },
});

const genInitialForm = () => ({
  description: '',
  enableSubmitterDraft: false,
  enableStatusUpdates: false,
  allowSubmitterToUploadFile: false,
  id: '',
  idps: [],
  isDirty: false,
  name: '',
  sendSubReceivedEmail: false,
  showSubmissionConfirmation: true,
  snake: '',
  submissionReceivedEmails: [],
  reminder_enabled: false,
  schedule: genInitialSchedule(),
  userType: IdentityMode.TEAM,
  versions: [],
  enableCopyExistingSubmission: false,
});

export const useFormStore = defineStore('form', {
  state: () => ({
    apiKey: undefined,
    drafts: [],
    fcProactiveHelpGroupList: {},
    fcProactiveHelpImageUrl: '',
    form: genInitialForm(),
    formSubmission: {
      confirmationId: '',
      submission: {
        data: {},
      },
    },
    formList: [],
    imageList: new Map(),
    permissions: [],
  }),
  getters: {
    isFormPublished: (state) =>
      state?.form?.versions?.length &&
      state.form.versions.some((v) => v.published),
  },
  actions: {
    async getFormsForCurrentUser() {
      try {
        // Get the forms based on the user's permissions
        const response = await rbacService.getCurrentUser();
        const data = response.data;
        // Build up the list of forms for the table
        const forms = data.forms.map((f) => ({
          currentVersionId: f.formVersionId,
          id: f.formId,
          idps: f.idps,
          name: f.formName,
          description: f.formDescription,
          permissions: f.permissions,
          published: f.published,
        }));
        this.formList = forms;
      } catch (error) {
        const i18n = useI18n({ useScope: 'global' });
        const notificationStore = useNotificationStore();
        notificationStore.addNotification({
          text: i18n.t('trans.store.form.getCurrUserFormsErrMsg'),
          consoleError: i18n.t('trans.store.form.getCurrUserFormsErrMsg', {
            error: error,
          }),
        });
      }
    },
    async deleteDraft(formId, draftId) {
      try {
        await formService.deleteDraft(formId, draftId);
      } catch (error) {
        const i18n = useI18n({ useScope: 'global' });
        const notificationStore = useNotificationStore();
        notificationStore.addNotification({
          text: i18n.t('trans.store.form.delDraftErrMsg'),
          consoleError: i18n.t('trans.store.form.delDraftConsErrMsg', {
            draftId: draftId,
            error: error,
          }),
        });
      }
    },
    async fetchDrafts(formId) {
      try {
        // Get any drafts for this form from the api
        const { data } = await formService.listDrafts(formId);
        this.drafts = data;
      } catch (error) {
        const i18n = useI18n({ useScope: 'global' });
        const notificationStore = useNotificationStore();
        notificationStore.addNotification({
          text: i18n.t('trans.store.form.fecthDraftErrMsg'),
          consoleError: i18n.t('trans.store.form.fecthDraftConsErrMsg', {
            formId: formId,
            error: error,
          }),
        });
      }
    },
    async fetchForm(formId) {
      try {
        this.apiKey = null;
        // Get the form definition from the api
        const { data } = await formService.readForm(formId);
        const identityProviders = parseIdps(data.identityProviders);
        data.idps = identityProviders.idps;
        data.userType = identityProviders.userType;
        data.sendSubRecieviedEmail =
          data.submissionReceivedEmails && data.submissionReceivedEmails.length;
        data.schedule = {
          ...genInitialSchedule(),
          ...data.schedule,
        };

        this.form = data;
      } catch (error) {
        const i18n = useI18n({ useScope: 'global' });
        const notificationStore = useNotificationStore();
        notificationStore.addNotification({
          text: i18n.t('trans.store.form.fecthFormErrMsg'),
          consoleError: i18n.t('trans.store.form.fecthFormErrMsg', {
            formId: formId,
            error: error,
          }),
        });
      }
    },
    async publishDraft(formId, draftId) {
      try {
        await formService.publishDraft(formId, draftId);
      } catch (error) {
        const i18n = useI18n({ useScope: 'global' });
        const notificationStore = useNotificationStore();
        notificationStore.addNotification({
          text: i18n.t('trans.store.form.publishDraftErrMsg'),
          consoleError: i18n.t('trans.store.form.publishDraftConsErrMsg', {
            draftId: draftId,
            error: error,
          }),
        });
      }
    },
    async toggleVersionPublish({ formId, versionId, publish }) {
      try {
        await formService.publishVersion(formId, versionId, publish);
      } catch (error) {
        const i18n = useI18n({ useScope: 'global' });
        const notificationStore = useNotificationStore();
        notificationStore.addNotification({
          text: `An error occurred while ${
            publish ? 'publishing' : 'unpublishing'
          }.`,
          consoleError: i18n.t('trans.store.form.toggleVersnPublConsErrMsg', {
            versionId: versionId,
            publish: publish,
            error: error,
          }),
        });
      }
    },
    async getFormPermissionsForUser(formId) {
      try {
        this.permissions = [];
        // Get the forms based on the user's permissions
        const response = await rbacService.getCurrentUser({ formId: formId });
        const data = response.data;
        if (data.forms[0]) {
          this.permissions = data.forms[0].permissions;
        } else {
          throw new Error('No form found');
        }
      } catch (error) {
        const i18n = useI18n({ useScope: 'global' });
        const notificationStore = useNotificationStore();
        notificationStore.addNotification({
          text: i18n.t('trans.store.form.getUserFormPermErrMsg'),
          consoleError: i18n.t('trans.store.form.getUserFormPermConsErrMsg', {
            formId: formId,
            error: error,
          }),
        });
      }
    },
    //
    // Form
    //
    async deleteCurrentForm() {
      const i18n = useI18n({ useScope: 'global' });
      const notificationStore = useNotificationStore();
      try {
        await formService.deleteForm(this.form.id);
        notificationStore.addNotification({
          text: i18n.t('trans.store.form.delCurrformNotiMsg', {
            name: this.form.name,
          }),
          ...NotificationTypes.SUCCESS,
        });
      } catch (error) {
        notificationStore.addNotification({
          text: i18n.t('trans.store.form.delCurrformNotiMsg', {
            name: this.form.name,
          }),
          consoleError: i18n.t('trans.store.form.delCurrFormConsErMsg', {
            id: this.form.id,
            error: error,
          }),
        });
      }
    },
    async updateForm() {
      try {
        const emailList =
          this.form.sendSubRecieviedEmail &&
          this.form.submissionReceivedEmails &&
          Array.isArray(this.form.submissionReceivedEmails)
            ? this.form.submissionReceivedEmails
            : [];

        const schedule = this.form.schedule.enabled ? this.form.schedule : {};

        // const reminder = this.form.schedule.enabled ?  : false ;

        await formService.updateForm(this.form.id, {
          name: this.form.name,
          description: this.form.description,
          enableSubmitterDraft: this.form.enableSubmitterDraft,
          enableStatusUpdates: this.form.enableStatusUpdates,
          identityProviders: generateIdps({
            idps: this.form.idps,
            userType: this.form.userType,
          }),
          showSubmissionConfirmation: this.form.showSubmissionConfirmation,
          submissionReceivedEmails: emailList,
          schedule: schedule,
          allowSubmitterToUploadFile: this.form.allowSubmitterToUploadFile,
          reminder_enabled: this.form.reminder_enabled
            ? this.form.reminder_enabled
            : false,
          enableCopyExistingSubmission: this.form.enableCopyExistingSubmission
            ? this.form.enableCopyExistingSubmission
            : false,
        });
      } catch (error) {
        const i18n = useI18n({ useScope: 'global' });
        const notificationStore = useNotificationStore();
        notificationStore.addNotification({
          text: i18n.t('trans.store.form.updateFormErrMsg'),
          consoleError: i18n.t('trans.store.form.updateFormConsErrMsg', {
            id: this.form.id,
            error: error,
          }),
        });
      }
    },
    async fetchSubmission({ submissionId }) {
      try {
        // Get this submission
        const response = await formService.getSubmission(submissionId);
        this.formSubmission = response.data.submission;
        this.form = response.data.form;
      } catch (error) {
        const i18n = useI18n({ useScope: 'global' });
        const notificationStore = useNotificationStore();
        notificationStore.addNotification({
          text: i18n.t('trans.store.form.fetchSubmissnErrMsg'),
          consoleError: i18n.t('trans.store.form.fetchSubmissnConsErrMsg', {
            submissionId: submissionId,
            error: error,
          }),
        });
      }
    },
    //
    // API Keys
    //
    async deleteApiKey(formId) {
      const i18n = useI18n({ useScope: 'global' });
      const notificationStore = useNotificationStore();
      try {
        await apiKeyService.deleteApiKey(formId);
        this.apiKey = null;
        notificationStore.addNotification({
          text: i18n.t('trans.store.form.deleteApiKeyNotifyMsg'),
          ...NotificationTypes.SUCCESS,
        });
      } catch (error) {
        notificationStore.addNotification({
          text: i18n.t('trans.store.form.deleteApiKeyErrMsg'),
          consoleError: i18n.t('trans.store.form.deleteApiKeyConsErrMsg', {
            formId: formId,
            error: error,
          }),
        });
      }
    },
    async generateApiKey(formId) {
      const i18n = useI18n({ useScope: 'global' });
      const notificationStore = useNotificationStore();
      try {
        const { data } = await apiKeyService.generateApiKey(formId);
        this.apiKey = data;
        notificationStore.addNotification({
          text: i18n.t('trans.store.form.generateApiKeyNotifyMsg'),
          ...NotificationTypes.SUCCESS,
        });
      } catch (error) {
        notificationStore.addNotification({
          text: 'An error occurred while trying to generate an API Key.',
          consoleError: `Error generating API Key for form ${formId}: ${error}`,
        });
      }
    },
    async readApiKey(formId) {
      try {
        const { data } = await apiKeyService.readApiKey(formId);
        this.apiKey = data;
      } catch (error) {
        const i18n = useI18n({ useScope: 'global' });
        const notificationStore = useNotificationStore();
        notificationStore.addNotification({
          text: i18n.t('trans.store.form.generateApiKeyErrMsg'),
          consoleError: i18n.t('trans.store.form.generateApiKeyConsErrMsg', {
            formId: formId,
            error: error,
          }),
        });
      }
    },

    async getFCProactiveHelpImageUrl(componentId) {
      try {
        this.fcProactiveHelpImageUrl = {};
        const response = this.imageList.get(componentId);
        if (response) {
          this.fcProactiveHelpImageUrl = response.data.url;
        } else {
          const response = await formService.getFCProactiveHelpImageUrl(
            componentId
          );
          this.imageList.set(componentId, response);
          this.fcProactiveHelpImageUrl = response.data.url;
        }
      } catch (error) {
        const i18n = useI18n({ useScope: 'global' });
        const notificationStore = useNotificationStore();
        notificationStore.addNotification({
          text: i18n.t('trans.store.form.getFCPHImageUrlErrMsg'),
          consoleError: i18n.t('trans.store.form.getFCPHImageUrlConsErrMsg', {
            error: error,
          }),
        });
      }
    },
    async setDirtyFlag(isDirty) {
      // When the form is detected to be dirty set the browser guards for closing the tab etc
      // There are also Vue route-specific guards so that we can ask before navigating away with the links
      // Look for those in the Views for the relevant pages, look for "beforeRouteLeave" lifecycle
      if (!this.form || this.form.isDirty === isDirty) return; // don't do anything if not changing the val (or if form is blank for some reason)
      this.form.isDirty = isDirty;
    },
  },
});
