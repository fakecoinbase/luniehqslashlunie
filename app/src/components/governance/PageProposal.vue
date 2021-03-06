<template>
  <TmPage
    data-title="Proposal"
    class="readable-width"
    :loading="$apollo.queries.proposal.loading"
  >
    <TmDataNotFound v-if="!found" />
    <template v-else>
      <div class="proposal">
        <div class="page-profile__header__info">
          <span :class="proposal.status | lowerCase" class="proposal-status">
            {{ status.badge }}
          </span>
          <div class="proposal-title__row">
            <h2 class="proposal-title">{{ proposal.title }}</h2>
          </div>
        </div>

        <div class="proposer-row">
          <p class="proposer">
            <template v-if="proposal.validator">
              Proposed by {{ proposal.validator.name }}:
              <Address :address="proposal.proposer" />
            </template>
            <template v-else-if="proposal.proposer !== `unknown`">
              Proposed by
              <Address :address="proposal.proposer" />
            </template>
            <template v-else>
              Unknown proposer
            </template>
          </p>
          <div class="button-container">
            <TmBtn
              v-if="proposal.status !== 'Passed'"
              id="deposit-btn"
              value="Deposit"
              :disabled="proposal.status !== 'DepositPeriod'"
              color="primary"
              @click.native="onDeposit"
            />
            <TmBtn
              id="vote-btn"
              value="Vote"
              :disabled="proposal.status !== 'VotingPeriod'"
              color="primary"
              @click.native="() => onVote()"
            />
          </div>
        </div>
      </div>

      <TextBlock :content="proposal.description" />

      <ul v-if="proposal.status === 'DepositPeriod'" class="row">
        <li>
          <h4>Deposit Count</h4>
          <span>
            {{ proposal.deposit }}
            /
            {{ parameters.depositThreshold }}
            {{ parameters.depositDenom }}
          </span>
        </li>
      </ul>

      <ul v-if="proposal.status !== `DepositPeriod`" class="row">
        <li v-if="proposal.status === `VotingPeriod`">
          <h4>Total Vote Count</h4>
          <span>
            {{ proposal.tally.totalVotedPercentage | percent }} /
            {{ proposal.tally.total | prettyInt }}
          </span>
        </li>
        <li>
          <h4>Yes</h4>
          <span>
            {{
              noVotes
                ? 0
                : (proposal.tally.yes / proposal.tally.total) | percent
            }}
            /
            {{ proposal.tally.yes | prettyInt }}
          </span>
        </li>
        <li>
          <h4>No</h4>
          <span>
            {{
              noVotes ? 0 : (proposal.tally.no / proposal.tally.total) | percent
            }}
            /
            {{ proposal.tally.no | prettyInt }}
          </span>
        </li>
        <li>
          <h4>Veto</h4>
          <span>
            {{
              noVotes
                ? 0
                : (proposal.tally.veto / proposal.tally.total) | percent
            }}
            /
            {{ proposal.tally.veto | prettyInt }}
          </span>
        </li>
        <li>
          <h4>Abstain</h4>
          <span>
            {{
              noVotes
                ? 0
                : (proposal.tally.abstain / proposal.tally.total) | percent
            }}
            /
            {{ proposal.tally.abstain | prettyInt }}
          </span>
        </li>
      </ul>

      <ul class="row">
        <li>
          <h4>Proposal ID</h4>
          <span>{{ proposal.id }}</span>
        </li>
        <li>
          <h4>Submitted</h4>
          <span>{{ proposal.creationTime | date }}</span>
        </li>
        <template
          v-if="['DepositPeriod', 'VotingPeriod'].includes(proposal.status)"
        >
          <li>
            <h4>{{ status.badge }} Start Date</h4>
            <span>{{ proposal.statusBeginTime | date }}</span>
          </li>
          <li>
            <h4>{{ status.badge }} End Date</h4>
            <span>
              {{ proposal.statusEndTime | date }} /
              {{ proposal.statusEndTime | fromNow }}
            </span>
          </li>
        </template>
        <template v-else>
          <li>
            <h4>Proposal Finalized ({{ status.badge }})</h4>
            <span>{{ proposal.statusEndTime | date }}</span>
          </li>
        </template>
      </ul>

      <ModalDeposit
        ref="modalDeposit"
        :proposal-id="proposalId"
        :proposal-title="proposal.title || ''"
        :denom="parameters.depositDenom"
        @success="() => afterDeposit()"
      />
      <ModalVote
        ref="modalVote"
        :proposal-id="proposalId"
        :proposal-title="proposal.title || ''"
        :last-vote-option="vote"
        @success="() => afterVote()"
      />
    </template>
  </TmPage>
</template>

<script>
import { mapGetters } from "vuex"
import { percent, prettyInt } from "scripts/num"
import { date, fromNow } from "src/filters"
import TmBtn from "common/TmBtn"
import TmDataNotFound from "common/TmDataNotFound"
import TextBlock from "common/TextBlock"
import ModalDeposit from "src/ActionModal/components/ModalDeposit"
import ModalVote from "src/ActionModal/components/ModalVote"
import TmPage from "common/TmPage"
import { getProposalStatus } from "scripts/proposal-status"
import { ProposalItem, GovernanceParameters, Vote } from "src/gql"
import BigNumber from "bignumber.js"
import Address from "common/Address"
import gql from "graphql-tag"

export default {
  name: `page-proposal`,
  components: {
    TmBtn,
    ModalDeposit,
    ModalVote,
    TmDataNotFound,
    TmPage,
    TextBlock,
    Address,
  },
  filters: {
    prettyInt,
    percent,
    date,
    fromNow,
    lowerCase: (text) => text.toLowerCase(),
  },
  props: {
    proposalId: {
      type: String,
      required: true,
    },
  },
  data: () => ({
    proposals: [],
    vote: undefined,
    proposal: {
      status: "",
      proposer: "",
      tally: {},
      validator: {},
    },
    parameters: {
      depositDenom: "TESTCOIN",
    },
    error: undefined,
    found: false,
    loaded: false,
  }),
  computed: {
    ...mapGetters([`address`, `network`]),
    status() {
      return getProposalStatus(this.proposal)
    },
    noVotes() {
      return BigNumber(this.proposal.tally.total).eq(0)
    },
    getNextProposalId() {
      let id = this.getProposalIndex(-1)
      return id
    },
    getPrevProposalId() {
      let id = this.getProposalIndex(1)
      return id
    },
  },
  watch: {
    // Needed to show data loading component when you are browsing from one proposal to another
    $route: function () {
      this.loaded = false
    },
  },
  methods: {
    onVote() {
      this.$refs.modalVote.open()
    },
    afterVote() {
      this.$apollo.queries.vote.refetch()
    },
    onDeposit() {
      this.$refs.modalDeposit.open()
    },
    afterDeposit() {
      this.$apollo.queries.proposal.refetch()
    },
    getProposalIndex(num) {
      let proposalsObj = this.proposals
      let proposalsIdArr = Object.values(proposalsObj).map(
        (proposal) => proposal.id
      )
      return proposalsIdArr[proposalsIdArr.indexOf(this.proposal.id) + num]
    },
  },
  apollo: {
    proposals: {
      query() {
        /* istanbul ignore next */
        return gql`
          query proposals($networkId: String!) {
            proposals(networkId: $networkId) {
              id
              status
            }
          }
        `
      },
      variables() {
        /* istanbul ignore next */
        return {
          networkId: this.network,
        }
      },
      update(data) {
        if (!data.proposals) {
          return []
        }
        /* istanbul ignore next */
        if (
          data.proposals.find(
            (proposal) => proposal.id === parseInt(this.proposalId, 10)
          )
        ) {
          this.found = true
        }
        /* istanbul ignore next */
        return data.proposals
      },
    },
    proposal: {
      query() {
        /* istanbul ignore next */
        return ProposalItem(this.network)
      },
      update(data) {
        /* istanbul ignore next */
        this.loaded = true
        /* istanbul ignore next */
        return data.proposal || {}
      },
      variables() {
        /* istanbul ignore next */
        return {
          id: +this.proposalId,
        }
      },
      skip() {
        /* istanbul ignore next */
        return !this.found
      },
      result(data) {
        /* istanbul ignore next */
        this.error = data.error
      },
    },
    parameters: {
      query() {
        /* istanbul ignore next */
        return GovernanceParameters(this.network)
      },
      update(data) {
        /* istanbul ignore next */
        return data.governanceParameters
      },
      skip() {
        /* istanbul ignore next */
        return !this.found
      },
      result(data) {
        /* istanbul ignore next */
        this.error = data.error
      },
    },
    vote: {
      query() {
        /* istanbul ignore next */
        return Vote(this.network)
      },
      variables() {
        /* istanbul ignore next */
        return {
          proposalId: +this.proposalId,
          address: this.address,
        }
      },
      skip() {
        /* istanbul ignore next */
        return !this.address || !this.found
      },
      update(data) {
        if (data.vote) return data.vote.option
        return undefined
      },
      result(data) {
        /* istanbul ignore next */
        this.error = data.error
      },
    },
    $subscribe: {
      blockAdded: {
        variables() {
          /* istanbul ignore next */
          return {
            networkId: this.network,
          }
        },
        query() {
          /* istanbul ignore next */
          return gql`
            subscription($networkId: String!) {
              blockAdded(networkId: $networkId) {
                height
              }
            }
          `
        },
        skip() {
          /* istanbul ignore next */
          return !this.found
        },
        result() {
          /* istanbul ignore next */
          if (
            // Don't update passed or rejected proposals
            this.proposal.status !== "Passed" &&
            this.proposal.status !== "Rejected" &&
            this.loaded
          ) {
            this.$apollo.queries.proposal.refetch()
            this.$apollo.queries.parameters.refetch()
            this.$apollo.queries.vote.refetch()
          }
        },
      },
    },
  },
}
</script>

<style scoped>
@import "../../styles/proposal-status.css";

.proposal-title__row {
  color: var(--bright);
}

.proposal-title__row a {
  color: var(--bright);
  padding-top: 1rem;
}

.proposal-title__row a:hover {
  color: var(--link-hover);
  padding-top: 1rem;
}

.proposal-title {
  color: var(--bright);
  font-size: var(--h1);
  line-height: 2.25rem;
  font-weight: 500;
  padding-top: 2rem;
}

.proposer {
  font-size: 12px;
  color: var(--txt);
}

.text-block {
  padding: 0 1rem 3rem;
}

.proposer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  margin: 2rem 0;
}

.button-container {
  display: flex;
  flex-direction: row;
}

.page-profile__header__info {
  padding: 1rem;
}

.button-container button:first-child {
  margin-right: 0.5rem;
}

.read-more-link {
  padding-top: 1rem;
  font-size: 14px;
  display: inline-block;
  cursor: pointer;
}

.read-more-link:hover {
  color: var(--link);
}

@media screen and (max-width: 667px) {
  .proposer-row {
    flex-direction: column;
  }

  .button-container {
    width: 100%;
    padding: 1rem;
  }

  .button-container button {
    width: 100%;
  }
}
</style>
