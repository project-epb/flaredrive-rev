import Axios from 'axios'
import * as VuePkg from 'vue'

declare global {
  export const axios: typeof Axios
  export const Vue: typeof VuePkg
  export interface Window {
    axios: typeof Axios
    Vue: typeof VuePkg
  }
}
