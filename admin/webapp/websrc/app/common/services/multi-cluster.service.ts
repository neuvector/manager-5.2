import { Inject, Injectable } from '@angular/core';
import * as $ from 'jquery';
import { Location } from '@angular/common';
import { HttpClient } from "@angular/common/http";
import { PathConstant } from '@common/constants/path.constant';
import { Router } from "@angular/router";
import { SESSION_STORAGE, StorageService } from 'ngx-webstorage-service';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {Cluster, ClusterData, ClusterSummary} from '@common/types';
import { GlobalVariable } from "@common/variables/global.variable";
import { TranslateService } from "@ngx-translate/core";
import { UtilsService } from '@common/utils/app.utils';
import {MultiClusterSummary} from "@common/types/scala_for_reference_only/MultiClusterSummary";

export interface Cluster2Promote {
  name: string;
  host: string;
  port: string;
}

export interface Cluster2Join {
  name: string;
  host: string;
  port: string;
  token: string;
  master_host: string;
  master_port: string;
}

@Injectable()
export class MultiClusterService {
  public clusters: Cluster[] = [];
  private _clusterSwitchedEvent = new Subject();
  public onClusterSwitchedEvent$ = this._clusterSwitchedEvent.asObservable();
  private readonly $win;
  private _selectedClusterSubject$ = new BehaviorSubject<Cluster | undefined>(undefined);
  private _selectedClusterSummarySubject$ = new BehaviorSubject<ClusterSummary | undefined>(undefined);
  selectedCluster$: Observable<Cluster | undefined> = this._selectedClusterSubject$.asObservable();
  selectedClusterSummary$: Observable<ClusterSummary | undefined> = this._selectedClusterSummarySubject$.asObservable();

  constructor(
    private tr: TranslateService,
    private utils: UtilsService,
    private http: HttpClient,
    private router: Router,
    private location: Location,
    @Inject(SESSION_STORAGE) private sessionStorage: StorageService
  ) {
    this.location = location;
    this.$win = $(GlobalVariable.window);
  }

  setSelectedCluster(cluster: Cluster | undefined) {
    this._selectedClusterSubject$.next(cluster);
  }

  setSelectedClusterSummary(summary: ClusterSummary | undefined) {
    this._selectedClusterSummarySubject$.next(summary);
  }

  getClusterName(): Observable<any> {
    return GlobalVariable.http.get(PathConstant.CONFIG_URL);
  }

  getClusters (): Observable<any> {
    return GlobalVariable.http
      .get(PathConstant.FED_MEMBER_URL);
  };

  getRemoteSummary(id): Observable<any>{
    return GlobalVariable.http.get(PathConstant.FED_SUMMARY, {params: {id: id}});
  }

  getLocalSummary(): Observable<any> {
    return GlobalVariable.http.get(PathConstant.DASHBOARD_SUMMARY_URL);
  }

  getMultiClusterSummary(params): Observable<any> {
    return this.http.get(PathConstant.MULTI_CLUSTER_SUMMARY, {params: params}).pipe();
  };

  updateCluster = (data: any, isEditable: boolean, useProxy: boolean) => {
    let payload = isEditable ? {
      poll_interval: 2,
      name: data.name,
      rest_info: {
        server: data.api_server,
        port: parseInt(data.api_port)
      },
      use_proxy: useProxy
    } : {
      poll_interval: 2,
      use_proxy: useProxy
    };
    return this.http.patch(PathConstant.FED_CFG_URL, payload);
  }

  promoteCluster = (data: any, useProxy) => {
    let payload = {
      name: data.name,
      master_rest_info: {
        server: data.host,
        port: parseInt(data.port)
      },
      use_proxy: useProxy
    };

    return this.http.post(PathConstant.FED_PROMOTE_URL, payload).pipe();
  };

  joinCluster = (data: any, useProxy) => {
    let payload = {
      name: data.name,
      server: data.master_host,
      port: data.master_port,
      join_token: data.token,
      joint_rest_info: {
        server: data.host,
        port: parseInt(data.port)
      },
      use_proxy: useProxy
    };
    return this.http.post(PathConstant.FED_JOIN_URL, payload).pipe();
  };

  demoteCluster = () => {
    return this.http.post(PathConstant.FED_DEMOTE_URL, "").pipe();
  };

  generateToken = () => {
    return this.http.get(PathConstant.FED_JOIN_TOKEN).pipe();
  };

  removeMember = id => {
    return this.http.delete(`${PathConstant.FED_REMOVE_URL}/${id}`).pipe();
  };

  leaveFromMaster = force => {
    let payload = {
      force: force
    };
    return this.http.post(PathConstant.FED_LEAVE_URL, payload).pipe();
  };

  switchCluster = (selectedID, currentID) => {
    if(selectedID.length > 0 ){
      return this.http.get(PathConstant.FED_REDIRECT_URL, {params: {id: selectedID}}).pipe();
    } else {
      return this.http.get(PathConstant.FED_REDIRECT_URL).pipe();
    }
  };

  dispatchSwitchEvent(){
    this._clusterSwitchedEvent.next(true);
  }
}
