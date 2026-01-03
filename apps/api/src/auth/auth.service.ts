import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { User } from '../entities/user.entity'
import { Organization } from '../entities/organization.entity'
import { LoginDto, RegisterDto, JwtPayload } from '@secure-task-management/data'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    private jwtService: JwtService
  ) {}

  async login(loginDto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
      relations: ['organization'],
    })

    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash
    )
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.orgId,
      parentOrganizationId: user.organization?.parentId || undefined,
    }

    const accessToken = this.jwtService.sign(payload)

    return {
      accessToken,
    }
  }

  async register(registerDto: RegisterDto): Promise<{ accessToken: string }> {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    })

    if (existingUser) {
      throw new ConflictException('User with this email already exists')
    }

    const organization = await this.organizationRepository.findOne({
      where: { id: registerDto.organizationId },
    })

    if (!organization) {
      throw new UnauthorizedException('Invalid organization')
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10)

    const user = this.userRepository.create({
      email: registerDto.email,
      passwordHash: hashedPassword,
      name: registerDto.name,
      role: registerDto.role,
      orgId: registerDto.organizationId,
    })

    await this.userRepository.save(user)

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.orgId,
      parentOrganizationId: organization.parentId,
    }

    const accessToken = this.jwtService.sign(payload)

    return {
      accessToken,
    }
  }
}
