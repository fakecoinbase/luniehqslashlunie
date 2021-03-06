<template>
  <SessionFrame icon="person_add">
    <TmFormStruct :submit="onSubmit">
      <h2 class="session-title">
        Create a new address
      </h2>
      <div
        v-if="!session.insecureMode && !session.mobile && !isTestnet"
        class="session-main"
      >
        <InsecureModeWarning />
      </div>
      <div v-else>
        <div class="session-main bottom-indent">
          <Steps
            v-if="!session.mobile"
            :steps="[`Create`, `Password`, `Backup`]"
            active-step="Create"
          />
          <DangerZoneWarning v-if="!session.mobile" />
          <TmFormGroup
            :error="$v.fieldName.$error"
            field-id="sign-up-name"
            field-label="Account Name"
          >
            <TmField
              id="sign-up-name"
              v-model.trim="fieldName"
              v-focus
              type="text"
              placeholder="Must be at least 3 characters"
              vue-focus="vue-focus"
            />
            <TmFormMsg
              v-if="$v.fieldName.$error && !$v.fieldName.required"
              name="Name"
              type="required"
            />
            <TmFormMsg
              v-if="$v.fieldName.$error && !$v.fieldName.minLength"
              name="Name"
              type="minLength"
              min="3"
            />
            <TmFormMsg
              v-if="$v.fieldName.$error && !$v.fieldName.nameExists"
              name="Name"
              type="custom"
              msg="already exists"
            />
          </TmFormGroup>
        </div>
        <div class="session-footer">
          <TmBtn value="Next" type="submit" />
        </div>
      </div>
    </TmFormStruct>
  </SessionFrame>
</template>

<script>
import { mapState, mapGetters } from "vuex"
import { required, minLength } from "vuelidate/lib/validators"
import TmBtn from "common/TmBtn"
import TmFormGroup from "common/TmFormGroup"
import TmFormStruct from "common/TmFormStruct"
import TmField from "common/TmField"
import TmFormMsg from "common/TmFormMsg"
import SessionFrame from "common/SessionFrame"
import DangerZoneWarning from "common/DangerZoneWarning"
import InsecureModeWarning from "common/InsecureModeWarning"
import Steps from "../../ActionModal/components/Steps"
import { getWalletIndex } from "@lunie/cosmos-keys"

const nameExists = (value) => {
  const walletIndex = getWalletIndex()
  if (walletIndex.some((e) => e.name === value)) {
    return false
  } else {
    return true
  }
}

export default {
  name: `session-sign-up`,
  components: {
    TmBtn,
    TmField,
    SessionFrame,
    TmFormGroup,
    TmFormMsg,
    TmFormStruct,
    DangerZoneWarning,
    InsecureModeWarning,
    Steps,
  },
  computed: {
    ...mapState([`session`, `signup`]),
    ...mapGetters([`network`, `networks`]),
    fieldName: {
      get() {
        return this.$store.state.signup.signUpName
      },
      set(value) {
        this.$store.commit(`updateField`, { field: `signUpName`, value })
      },
    },
    isTestnet() {
      const selectedNetwork = this.networks.find(
        ({ id }) => id === this.network
      )
      return selectedNetwork ? selectedNetwork.testnet : false
    },
  },
  methods: {
    async onSubmit() {
      this.$v.$touch()
      if (this.$v.$error) return
      this.$router.push(`/create/password`)
    },
  },
  validations: () => ({
    fieldName: { required, minLength: minLength(3), nameExists },
  }),
}
</script>
