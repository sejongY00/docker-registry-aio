<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">사용자</h1>
        <p class="mt-1 text-muted-foreground">Docker 로그인 계정과 저장소 ACL을 관리합니다.</p>
      </div>
      <Button class="gap-2" @click="startCreate">
        <UserPlus class="size-4" />
        사용자 추가
      </Button>
    </div>

    <Alert v-if="error" variant="destructive">
      <CircleAlert class="size-4" />
      <AlertTitle>요청 실패</AlertTitle>
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <Card class="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="pl-6">사용자</TableHead>
            <TableHead>역할</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>ACL</TableHead>
            <TableHead class="w-28 pr-6 text-right">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="user in users" :key="user.id">
            <TableCell class="pl-6">
              <div class="flex items-center gap-3">
                <span class="flex size-8 items-center justify-center rounded-full bg-muted">
                  <UserRound class="size-4" />
                </span>
                <span class="font-mono font-medium">{{ user.username }}</span>
              </div>
            </TableCell>
            <TableCell>
              <Badge :variant="user.role === 'ADMIN' ? 'default' : 'secondary'">{{ user.role }}</Badge>
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2 text-sm">
                <span class="size-2 rounded-full" :class="user.active ? 'bg-emerald-500' : 'bg-muted-foreground'" />
                {{ user.active ? '활성' : '비활성' }}
              </div>
            </TableCell>
            <TableCell>
              <Badge v-if="user.role === 'ADMIN'" variant="outline">전체 권한</Badge>
              <div v-else class="flex max-w-md flex-wrap gap-1.5">
                <Badge v-for="acl in user.acls" :key="acl.id" variant="outline" class="font-mono font-normal">
                  {{ acl.repository }}
                  ·
                  {{
                    [
                      acl.canPull ? 'pull' : null,
                      acl.canPush ? 'push' : null,
                      acl.canDelete ? 'delete' : null,
                    ]
                      .filter(Boolean)
                      .join('/')
                  }}
                </Badge>
                <span v-if="!user.acls.length" class="text-sm text-muted-foreground">ACL 없음</span>
              </div>
            </TableCell>
            <TableCell class="pr-6 text-right">
              <div class="flex justify-end gap-1">
                <Button variant="ghost" size="icon" title="편집" @click="startEdit(user)">
                  <Pencil class="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  class="text-destructive hover:text-destructive"
                  title="삭제"
                  @click="removeUser(user)"
                >
                  <Trash2 class="size-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Card>

    <Dialog v-model:open="editing">
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form class="space-y-5" @submit.prevent="save">
          <DialogHeader>
            <DialogTitle>{{ form.id ? '사용자 편집' : '사용자 추가' }}</DialogTitle>
            <DialogDescription>이 계정은 관리 UI와 Docker CLI 로그인에 함께 사용됩니다.</DialogDescription>
          </DialogHeader>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label for="username">사용자명</Label>
              <Input id="username" v-model="form.username" class="font-mono" :disabled="!!form.id" required />
            </div>
            <div class="space-y-2">
              <Label for="password">비밀번호 {{ form.id ? '(비워두면 유지)' : '' }}</Label>
              <Input id="password" v-model="form.password" type="password" :required="!form.id" />
            </div>
            <div class="space-y-2">
              <Label>역할</Label>
              <Select v-model="form.role">
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="역할 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">USER</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="flex items-end pb-2">
              <label class="flex items-center gap-2 text-sm font-medium">
                <Checkbox v-model="form.active" />
                활성 계정
              </label>
            </div>
          </div>

          <Separator />

          <div v-if="form.role === 'USER'" class="space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <Label>저장소 ACL</Label>
                <p class="mt-1 text-xs text-muted-foreground">저장소 패턴별 허용 작업을 선택하세요.</p>
              </div>
              <Button variant="outline" size="sm" type="button" class="gap-2" @click="addAcl">
                <Plus class="size-4" />
                ACL 추가
              </Button>
            </div>
            <Card v-for="(acl, idx) in form.acls" :key="idx" class="bg-muted/30">
              <CardContent class="space-y-3 pt-4">
                <div class="flex gap-2">
                  <Input
                    v-model="acl.repository"
                    class="font-mono"
                    placeholder="예: demo/* 또는 library/nginx"
                    required
                  />
                  <Button variant="ghost" size="icon" type="button" @click="form.acls.splice(idx, 1)">
                    <X class="size-4" />
                  </Button>
                </div>
                <div class="flex flex-wrap gap-5">
                  <label class="flex items-center gap-2 text-sm">
                    <Checkbox v-model="acl.canPull" /> pull
                  </label>
                  <label class="flex items-center gap-2 text-sm">
                    <Checkbox v-model="acl.canPush" /> push
                  </label>
                  <label class="flex items-center gap-2 text-sm">
                    <Checkbox v-model="acl.canDelete" /> delete
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" @click="editing = false">취소</Button>
            <Button type="submit" :disabled="saving">
              <LoaderCircle v-if="saving" class="size-4 animate-spin" />
              저장
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import {
  CircleAlert,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  UserRound,
  X,
} from '@lucide/vue'

useHead({ title: '사용자' })

type AclForm = {
  repository: string
  canPull: boolean
  canPush: boolean
  canDelete: boolean
}

type UserRow = {
  id: string
  username: string
  role: 'ADMIN' | 'USER'
  active: boolean
  acls: Array<AclForm & { id: string }>
}

const error = ref('')
const editing = ref(false)
const saving = ref(false)
const form = reactive({
  id: '',
  username: '',
  password: '',
  role: 'USER' as 'ADMIN' | 'USER',
  active: true,
  acls: [] as AclForm[],
})

const { data, refresh } = await useFetch<{ users: UserRow[] }>('/api/users')
const users = computed(() => data.value?.users || [])

const me = await useFetch<{ user: { role: string } | null }>('/api/auth/me', { key: 'auth-me' })
if (me.data.value?.user?.role !== 'ADMIN') {
  await navigateTo('/')
}

function startCreate() {
  form.id = ''
  form.username = ''
  form.password = ''
  form.role = 'USER'
  form.active = true
  form.acls = [{ repository: '*', canPull: true, canPush: true, canDelete: false }]
  editing.value = true
}

function startEdit(user: UserRow) {
  form.id = user.id
  form.username = user.username
  form.password = ''
  form.role = user.role
  form.active = user.active
  form.acls = user.acls.map((a) => ({
    repository: a.repository,
    canPull: a.canPull,
    canPush: a.canPush,
    canDelete: a.canDelete,
  }))
  editing.value = true
}

function addAcl() {
  form.acls.push({ repository: '', canPull: true, canPush: false, canDelete: false })
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    if (form.id) {
      await $fetch(`/api/users/${form.id}`, {
        method: 'PUT',
        body: {
          ...(form.password ? { password: form.password } : {}),
          role: form.role,
          active: form.active,
          acls: form.role === 'USER' ? form.acls : [],
        },
      })
    } else {
      await $fetch('/api/users', {
        method: 'POST',
        body: {
          username: form.username,
          password: form.password,
          role: form.role,
          active: form.active,
          acls: form.role === 'USER' ? form.acls : [],
        },
      })
    }
    editing.value = false
    await refresh()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '저장에 실패했습니다'
  } finally {
    saving.value = false
  }
}

async function removeUser(user: UserRow) {
  if (!confirm(`${user.username} 사용자를 삭제할까요?`)) return
  try {
    await $fetch(`/api/users/${user.id}`, { method: 'DELETE' })
    await refresh()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '삭제에 실패했습니다'
  }
}
</script>
