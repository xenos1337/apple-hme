import { v4 as uuidv4 } from 'uuid';

export class UnsuccessfulRequestError extends Error {}

type ServiceName = 'premiummailsettings';

export type Webservice = {
  url: string;
  status: string;
};

export type Webservices = Record<ServiceName, Webservice>;

export type ICloudClientContext = {
  clientId?: string;
  dsid?: string;
};

export const DEFAULT_SETUP_URL = 'https://setup.icloud.com/setup/ws/1';
export const CN_SETUP_URL = 'https://setup.icloud.com.cn/setup/ws/1';

// These values are part of the current Hide My Email web-client contract.
// Keep them in one place so an iCloud web-client update only requires a
// single change.
export const CLIENT_BUILD_NUMBER = '2628Build19';
export const CLIENT_MASTERING_NUMBER = '2628Build19';

type SetupValidationResponse = {
  webservices?: Webservices;
  dsInfo?: {
    dsid?: string | number;
  };
  dsid?: string | number;
  success?: boolean;
  error?: {
    errorMessage?: string;
  };
};

class ICloudClient {
  public readonly clientId: string;
  public dsid?: string;

  constructor(
    readonly setupUrl: typeof DEFAULT_SETUP_URL | typeof CN_SETUP_URL,
    public webservices?: Webservices,
    clientIdOrContext: string | ICloudClientContext = uuidv4(),
    dsid?: string
  ) {
    if (typeof clientIdOrContext === 'string') {
      this.clientId = clientIdOrContext;
      this.dsid = dsid;
    } else {
      this.clientId = clientIdOrContext.clientId || uuidv4();
      this.dsid = clientIdOrContext.dsid;
    }
  }

  public context(): ICloudClientContext & { clientId: string } {
    return {
      clientId: this.clientId,
      ...(this.dsid === undefined ? {} : { dsid: this.dsid }),
    };
  }

  public async request(
    method: 'GET' | 'POST',
    url: string,
    options: {
      headers?: Record<string, string>;
      data?: Record<string, unknown>;
    } = {}
  ): Promise<unknown> {
    const { headers = {}, data = undefined } = options;
    const requestHeaders = {
      ...(data === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    };

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: data !== undefined ? JSON.stringify(data) : undefined,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new UnsuccessfulRequestError(
        `Request to ${method} ${url} failed with status code ${response.status}`
      );
    }

    return await response.json();
  }

  public webserviceUrl(serviceName: ServiceName): string {
    const webservice = this.webservices?.[serviceName];
    if (webservice === undefined) {
      throw new Error('webservices have not been initialised');
    }
    return webservice.url;
  }

  public async isAuthenticated(): Promise<boolean> {
    try {
      await this.validateToken();
      return true;
    } catch {
      return false;
    }
  }

  public async validateToken(): Promise<void> {
    const response = (await this.request(
      'POST',
      `${this.setupUrl}/validate`
    )) as SetupValidationResponse;

    if (response.success === false) {
      throw new UnsuccessfulRequestError(
        response.error?.errorMessage || 'iCloud authentication failed'
      );
    }

    if (response.webservices) {
      this.webservices = response.webservices;
    }

    const discoveredDsid = response.dsInfo?.dsid ?? response.dsid;
    if (discoveredDsid !== undefined && discoveredDsid !== null) {
      this.dsid = String(discoveredDsid);
    }
  }

  /**
   * Refreshes the setup session when a client was restored from older
   * extension storage and is missing the account context required by HME.
   */
  public async ensureHmeContext(): Promise<void> {
    if (this.webservices === undefined || this.dsid === undefined) {
      await this.validateToken();
    }

    if (this.webservices === undefined) {
      throw new Error('webservices have not been initialised');
    }

    if (this.dsid === undefined) {
      throw new Error('iCloud DSID has not been initialised');
    }
  }

  public async hmeUrl(version: 'v1' | 'v2', path: string): Promise<string> {
    await this.ensureHmeContext();

    const serviceUrl = this.webserviceUrl('premiummailsettings').replace(
      /\/+$/,
      ''
    );
    const { dsid } = this;
    if (dsid === undefined) {
      throw new Error('iCloud DSID has not been initialised');
    }
    const endpoint = path.replace(/^\/+/, '');
    const url = new URL(`${serviceUrl}/${version}/${endpoint}`);

    url.searchParams.set('clientBuildNumber', CLIENT_BUILD_NUMBER);
    url.searchParams.set('clientMasteringNumber', CLIENT_MASTERING_NUMBER);
    url.searchParams.set('clientId', this.clientId);
    url.searchParams.set('dsid', dsid);

    return url.toString();
  }

  public async signOut(
    options: { trust: boolean } = { trust: false }
  ): Promise<void> {
    const { trust } = options;
    await this.request('POST', `${this.setupUrl}/logout`, {
      data: {
        trustBrowsers: trust,
        allBrowsers: trust,
      },
    }).catch(console.debug);
  }
}

export type HmeEmail = {
  origin: 'ON_DEMAND' | 'SAFARI';
  anonymousId: string;
  domain: string;
  forwardToEmail: string;
  hme: string;
  isActive: boolean;
  label: string;
  note: string;
  createTimestamp: number;
  recipientMailId: string;
  inputElementXPath?: string;
};

type RawHmeEmail = Omit<HmeEmail, 'forwardToEmail'> & {
  forwardToEmail?: string;
};

export type ListHmeResult = {
  hmeEmails: HmeEmail[];
  selectedForwardTo: string;
  forwardToEmails: string[];
};

type RawListHmeResult = Omit<ListHmeResult, 'hmeEmails'> & {
  hmeEmails: RawHmeEmail[];
};

type PremiumMailSettingsResponse<T = unknown> = {
  success: boolean;
  result: T;
  error?: {
    errorMessage?: string;
  };
};

const responseError = (
  response: PremiumMailSettingsResponse,
  fallback: string
): string => response.error?.errorMessage || fallback;

const normaliseHmeEmail = (
  hmeEmail: RawHmeEmail,
  selectedForwardTo?: string
): HmeEmail => ({
  ...hmeEmail,
  forwardToEmail: hmeEmail.forwardToEmail ?? selectedForwardTo ?? '',
});

export class ListHmeException extends Error {}
export class GetHmeException extends Error {}
export class GenerateHmeException extends Error {}
export class ReserveHmeException extends Error {}
export class UpdateHmeMetadataException extends Error {}
export class DeactivateHmeException extends Error {}
export class ReactivateHmeException extends Error {}
export class DeleteHmeException extends Error {}
export class UpdateFwdToHmeException extends Error {}

export class PremiumMailSettings {
  constructor(readonly client: ICloudClient) {}

  async listHme(): Promise<ListHmeResult> {
    const response = (await this.client.request(
      'GET',
      await this.client.hmeUrl('v2', 'hme/list')
    )) as PremiumMailSettingsResponse<RawListHmeResult>;

    if (!response.success) {
      throw new ListHmeException(
        responseError(response, 'Failed to list HME addresses')
      );
    }

    return {
      ...response.result,
      hmeEmails: response.result.hmeEmails.map((hmeEmail) =>
        normaliseHmeEmail(hmeEmail, response.result.selectedForwardTo)
      ),
    };
  }

  async generateHme(): Promise<string> {
    const response = (await this.client.request(
      'POST',
      await this.client.hmeUrl('v1', 'hme/generate'),
      { data: { langCode: 'en-us' } }
    )) as PremiumMailSettingsResponse<{ hme: string }>;

    if (!response.success) {
      throw new GenerateHmeException(
        responseError(response, 'Failed to generate HME')
      );
    }

    return response.result.hme;
  }

  async reserveHme(
    hme: string,
    label: string,
    note:
      | string
      | undefined = 'Generated through the iCloud Hide My Email browser extension'
  ): Promise<HmeEmail> {
    const response = (await this.client.request(
      'POST',
      await this.client.hmeUrl('v1', 'hme/reserve'),
      { data: { hme, label, note } }
    )) as PremiumMailSettingsResponse<{ hme: RawHmeEmail }>;

    if (!response.success) {
      throw new ReserveHmeException(
        responseError(response, 'Failed to reserve HME')
      );
    }

    return normaliseHmeEmail(response.result.hme);
  }

  async getHme(anonymousId: string): Promise<HmeEmail> {
    const response = (await this.client.request(
      'POST',
      await this.client.hmeUrl('v2', 'hme/get'),
      { data: { anonymousId } }
    )) as PremiumMailSettingsResponse<{ hme: RawHmeEmail }>;

    if (!response.success) {
      throw new GetHmeException(
        responseError(response, 'Failed to get HME address')
      );
    }

    return normaliseHmeEmail(response.result.hme);
  }

  async updateHmeMetadata(
    anonymousId: string,
    label: string,
    note?: string
  ): Promise<void> {
    const response = (await this.client.request(
      'POST',
      await this.client.hmeUrl('v1', 'hme/updateMetaData'),
      { data: { anonymousId, label, note } }
    )) as PremiumMailSettingsResponse;

    if (!response.success) {
      throw new UpdateHmeMetadataException('Failed to update HME metadata');
    }
  }

  async deactivateHme(anonymousId: string): Promise<void> {
    const response = (await this.client.request(
      'POST',
      await this.client.hmeUrl('v1', 'hme/deactivate'),
      { data: { anonymousId } }
    )) as PremiumMailSettingsResponse;

    if (!response.success) {
      throw new DeactivateHmeException('Failed to deactivate HME');
    }
  }

  async reactivateHme(anonymousId: string): Promise<void> {
    const response = (await this.client.request(
      'POST',
      await this.client.hmeUrl('v1', 'hme/reactivate'),
      { data: { anonymousId } }
    )) as PremiumMailSettingsResponse;

    if (!response.success) {
      throw new ReactivateHmeException('Failed to reactivate HME');
    }
  }

  async deleteHme(anonymousId: string): Promise<void> {
    const response = (await this.client.request(
      'POST',
      await this.client.hmeUrl('v1', 'hme/delete'),
      { data: { anonymousId } }
    )) as PremiumMailSettingsResponse;

    if (!response.success) {
      throw new DeleteHmeException('Failed to delete HME');
    }
  }

  async updateForwardToHme(forwardToEmail: string): Promise<void> {
    const response = (await this.client.request(
      'POST',
      await this.client.hmeUrl('v1', 'hme/updateForwardTo'),
      { data: { forwardToEmail } }
    )) as PremiumMailSettingsResponse;

    if (!response.success) {
      throw new UpdateFwdToHmeException(
        'Failed to update the Forward To email.'
      );
    }
  }
}

export default ICloudClient;
